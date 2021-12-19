
import type {
    Channel, ChannelMessageFromPage,
    ComponentRendered, ComponentDisposed, DomNodeRegistered, DomNodeRemoved, DomNodeIsRoot, DomNodeRootDisposed, DomNodeAddedResultOf, DomNodeInserted, DomNodeAppended
} from '../../channel/channel-message-types';
import type {Logger} from './debug-log';
import type {ComponentMirror, DomNodeMirror, Root, RegistryMirror} from './registry-mirror-types';
import {connectDomTree, disconnectDomTree, connectedResultAdded, findAndConnectToParentComponent, removeComponentFromTree, removeDomNodeFromComponentResult} from './connect-components';

const registryMessages = ['componentRendered', 'componentDisposed', 'domNodeRegistered', 'domNodeRemoved', 'domNodeIsRoot', 'domNodeRootDisposed', 'domNodeAddedResultOf', 'domNodeAppended', 'domNodeInserted'] as const;

class RegistryMirrorImpl {

    componentMap: Map<string, ComponentMirror>;
    roots: Root[];
    domNodeMap: Map<string, DomNodeMirror>;

    constructor(
        public logger: Logger
    ) {
        this.componentMap = new Map();
        this.roots = [];
        this.domNodeMap = new Map();
    }

    subscribe(channel: Channel<'devtools'>): void {
        for (const m of registryMessages) {
            channel.addListener(m, this[m] as (message: ChannelMessageFromPage) => void);
        }
    }

    unsubscribe(channel: Channel<'devtools'>): void {
        for (const m of registryMessages) {
            channel.removeListener(m, this[m] as (message: ChannelMessageFromPage) => void);
        }
    }

    componentRendered = ({id, name, props}: ComponentRendered) => {
        if (this.componentMap.has(id)) {
            this.logger('error', `RegistryMirror.componentRendered: component is already here. id=${id}`);
        } else {
            const component: ComponentMirror = {id, name, props, result: [], children: []};
            this.componentMap.set(id, component);
        }
    };

    componentDisposed = ({id}: ComponentDisposed) => {
        const component = this.componentMap.get(id);
        if (!component) {
            this.logger('error', `RegistryMirror.componentDisposed: unknown component id: ${id}`);
        } else {
            for (const resultNode of component.result) {
                const resultIndex = resultNode.resultOf.indexOf(id);
                if (resultIndex >= 0) {
                    resultNode.resultOf.splice(resultIndex, 1);
                }
            }
            component.result.length = 0;
            removeComponentFromTree(this.logger, component);
            this.componentMap.delete(id);
        }
    };

    domNodeRegistered = ({id, nodeType, name, value}: DomNodeRegistered) => {
        if (this.domNodeMap.has(id)) {
            this.logger('error', `RegistryMirror.domNodeRegistered: dom node is already here. id=${id}`);
        } else {
            const node: DomNodeMirror = {id, nodeType, name, value, children: [], resultOf: []};
            this.domNodeMap.set(id, node);
        }
    };

    domNodeRemoved = ({id}: DomNodeRemoved) => {
        const node = this.domNodeMap.get(id);
        if (!node) {
            this.logger('error', `RegistryMirror.domNodeRemoved: unknown dom node id: ${id}`);
        } else {
            this.removeDomNode(node);
        }
    };

    domNodeIsRoot = ({id}: DomNodeIsRoot) => {
        const node = this.domNodeMap.get(id);
        if (!node) {
            this.logger('error', `RegistryMirror.domNodeIsRoot: unknown dom node id: ${id}`);
        } else {
            const rootIndex = this.roots.findIndex(r => r.domNode === node);
            if (rootIndex < 0) {
                const components = connectDomTree(this.componentMap, this.logger, node);
                const root = {domNode: node, components};
                for (const component of root.components) {
                    component.parent = {parentKind: 'root', root};
                }
                this.roots.push(root);
            }
        }
    };

    domNodeRootDisposed = ({id}: DomNodeRootDisposed) => {
        const node = this.domNodeMap.get(id);
        if (!node) {
            this.logger('error', `RegistryMirror.domNodeRootDisposed: unknown dom node id: ${id}`);
        } else {
            const rootIndex = this.roots.findIndex(r => r.domNode === node);
            if (rootIndex < 0) {
                this.logger('error', `RegistryMirror.domNodeRootDisposed: dom node is not root. id=${id}`);
            } else {
                this.roots.splice(rootIndex, 1);
                disconnectDomTree(node);
            }
        }
    };

    domNodeAddedResultOf = ({id, resultOf, index}: DomNodeAddedResultOf) => {
        const node = this.domNodeMap.get(id);
        if (!node) {
            this.logger('error', `RegistryMirror.domNodeAddedResultOf: unknown dom node id: ${id}`);
        } else {
            if (index.length > 1) {
                this.logger('error', `RegistryMirror.domNodeAddedResultOf: multi-level index for node ${id}: this is not expected. index: ${JSON.stringify(index)}`);
            } else {
                const component = this.componentMap.get(resultOf);
                if (!component) {
                    this.logger('error', `RegistryMirror.domNodeAddedResultOf: unknown component id: ${id}`);
                } else {
                    node.resultOf.push(resultOf);
                    component.result[index[0]] = node;
                    if (node.connected && !component.parent) {
                        connectedResultAdded(this.roots, this.componentMap, this.logger, component, node);
                    }
                }
            }
        }
    };

    domNodeAppended = ({parentId, childIds}: DomNodeAppended) => {
        const {parentNode, childNodes} = this.findParentChildNodes('RegistryMirror.domNodeAppended', parentId, childIds);
        childNodes.forEach(removeFromChildren);
        if (parentNode) {
            parentNode.children.push(...childNodes);
            assignParent(parentNode, childNodes);
            if (parentNode.connected) {
                const components = childNodes.flatMap(childNode => connectDomTree(this.componentMap, this.logger, childNode));
                if (components.length) {
                    findAndConnectToParentComponent({
                        roots: this.roots,
                        componentMap: this.componentMap,
                        logger: this.logger,
                        parentNode,
                        components,
                        prevSiblingIndex: parentNode.children.length - childNodes.length - 1,
                        nextSiblingIndex:  parentNode.children.length
                    });
                }
            }
        }
    };

    domNodeInserted = ({parentId, childIds, prevId, nextId}: DomNodeInserted) => {
        const {parentNode, childNodes} = this.findParentChildNodes('RegistryMirror.domNodeInserted', parentId, childIds);
        childNodes.forEach(removeFromChildren);
        if (parentNode) {
            const index = this.validateInsertionIndex({parentNode, prevId, nextId});
            if (index !== undefined) {
                parentNode.children.splice(index, 0, ...childNodes);
                assignParent(parentNode, childNodes);
                if (parentNode.connected) {
                    const components = childNodes.flatMap(childNode => connectDomTree(this.componentMap, this.logger, childNode));
                    if (components.length) {
                        findAndConnectToParentComponent({
                            roots: this.roots,
                            componentMap: this.componentMap,
                            logger: this.logger,
                            parentNode,
                            components,
                            prevSiblingIndex: index - 1,
                            nextSiblingIndex: index + childNodes.length
                        });
                    }
                }
            }
        }
    };

    validateInsertionIndex({parentNode, prevId, nextId}: {parentNode: DomNodeMirror; prevId?: string; nextId?: string}): number | undefined {
        let index: number | undefined;
        const prevNode: DomNodeMirror | undefined = prevId ? this.domNodeMap.get(prevId) : undefined;
        const nextNode: DomNodeMirror | undefined = nextId ? this.domNodeMap.get(nextId) : undefined;
        if (prevId && !prevNode) {
            this.logger('error', `RegistryMirror.domNodeInserted: unknown prev dom node id: ${prevId}`);
        } else if (nextId && !nextNode) {
            this.logger('error', `RegistryMirror.domNodeInserted: unknown next dom node id: ${nextId}`);
        } else {
            const prevIndex = prevNode ? parentNode.children.indexOf(prevNode) : undefined;
            const nextIndex = nextNode ? parentNode.children.indexOf(nextNode) : undefined;
            if (prevNode && prevIndex! < 0) {
                this.logger('error', `RegistryMirror.domNodeInserted: prev dom node can not be found in parent children: ${prevId!}`);
            } else if (nextNode && nextIndex! < 0) {
                this.logger('error', `RegistryMirror.domNodeInserted: next dom node can not be found in parent children: ${prevId!}`);
            } else if (prevIndex === undefined && nextIndex === undefined) {
                index = parentNode.children.length;
            } else {
                if (prevIndex !== undefined && nextIndex !== undefined) {
                    if (prevIndex + 1 === nextIndex) {
                        index = nextIndex;
                    }
                } else if (prevIndex === undefined) {
                    if (nextIndex === 0) {
                        index = 0;
                    }
                } else if (nextIndex === undefined) {
                    if (prevIndex === parentNode.children.length - 1) {
                        index = parentNode.children.length;
                    }
                }
                if (index === undefined) {
                    const indexes = `prevIndex, nextIndex: ${prevIndex ?? 'undefined'}, ${nextIndex ?? 'undefined'}`;
                    const ids = `parentNode ${parentNode.id} prevId ${prevId ?? 'undefined'} nextId ${nextId ?? 'undefined'}`;
                    this.logger('error', `RegistryMirror.domNodeInserted: unexpected ${indexes} for ${ids}`);
                }
            }
        }
        return index;
    }

    findParentChildNodes(operation: string, parentId: string, childIds: string[]): {parentNode?: DomNodeMirror; childNodes: DomNodeMirror[]} {
        const parentNode = this.domNodeMap.get(parentId);
        if (!parentNode) {
            this.logger('error', `${operation}: unknown parent dom node id: ${parentId}`);
            return {childNodes: []};
        } else {
            return {parentNode, childNodes:
                childIds
                .map(id => ({id, node: this.domNodeMap.get(id)}))
                .filter(({id, node}) => {
                    if (node) {
                        return true;
                    } else {
                        this.logger('error', `${operation}: unknown child dom node id: ${id}`);
                        return false;
                    }
                })
                .map(({node}) => node!)
            };
        }
    }

    removeDomNode(node: DomNodeMirror): void {
        removeFromChildren(node);
        const rootIndex = this.roots.findIndex(r => r.domNode === node);
        if (rootIndex >= 0) {
            this.roots.splice(rootIndex, 1);
        }
        this.removeDomTree(node);
    }

    removeDomTree(node: DomNodeMirror): void {
        this.domNodeMap.delete(node.id);
        removeDomNodeFromComponentResult(this.componentMap, this.logger, node);
        for (const c of node.children) {
            this.removeDomTree(c);
        }
        node.resultOf.length = 0;
        delete node.parent;
        delete node.connected;
        node.children.length = 0;
    }
}

function assignParent(parentNode: DomNodeMirror, childNodes: DomNodeMirror[]): void {
    for (const node of childNodes) {
        node.parent = parentNode;
    }
}

function removeFromChildren(node: DomNodeMirror): void {
    const childIndex = node.parent?.children.indexOf(node);
    if (childIndex !== undefined && childIndex >= 0) {
        node.parent?.children.splice(childIndex, 1);
    }
}

function createRegistryMirror(logger: Logger): RegistryMirror {
    return new RegistryMirrorImpl(logger);
}

export {createRegistryMirror};
