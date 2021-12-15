
import type {
    Channel, ChannelMessageFromPage,
    ComponentRendered, ComponentDisposed, DomNodeRegistered, DomNodeRemoved, DomNodeIsRoot, DomNodeRootDisposed, DomNodeAddedResultOf, DomNodeInserted, DomNodeAppended
} from '../../channel/channel-message-types';
import type {SerializedValue} from '../../channel/serialized-value';
import type {Logger} from './debug-log';

export type ComponentResultMirror = DomNodeMirror;

export interface ComponentMirror {
    id: string;
    name: string;
    props: SerializedValue;
    result: ComponentResultMirror[];
}

export interface DomNodeMirror {
    id: string;
    nodeType: number;
    name?: string | null;
    value?: string | null;
    connected?: boolean;
    parent?: DomNodeMirror;
    children: DomNodeMirror[];
    resultOf: string[];
}

export interface RegistryMirror {
    subscribe(channel: Channel<'devtools'>): void;
    unsubscribe(channel: Channel<'devtools'>): void;
}

const registryMessages = ['componentRendered', 'componentDisposed', 'domNodeRegistered', 'domNodeRemoved', 'domNodeIsRoot', 'domNodeRootDisposed', 'domNodeAddedResultOf', 'domNodeAppended', 'domNodeInserted'] as const;

class RegistryMirrorImpl {

    componentMap: Map<string, ComponentMirror>;
    rootDomNodes: DomNodeMirror[];
    domNodeMap: Map<string, DomNodeMirror>;

    constructor(
        public logger: Logger
    ) {
        this.componentMap = new Map();
        this.rootDomNodes = [];
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
            const component: ComponentMirror = {id, name, props, result: []};
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
            const rootIndex = this.rootDomNodes.indexOf(node);
            if (rootIndex < 0) {
                this.rootDomNodes.push(node);
                connectDomTree(node);
            }
        }
    };

    domNodeRootDisposed = ({id}: DomNodeRootDisposed) => {
        const node = this.domNodeMap.get(id);
        if (!node) {
            this.logger('error', `RegistryMirror.domNodeRootDisposed: unknown dom node id: ${id}`);
        } else {
            const rootIndex = this.rootDomNodes.indexOf(node);
            if (rootIndex < 0) {
                this.logger('error', `RegistryMirror.domNodeRootDisposed: dom node is not root. id=${id}`);
            } else {
                this.rootDomNodes.splice(rootIndex, 1);
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
        const rootIndex = this.rootDomNodes.indexOf(node);
        if (rootIndex >= 0) {
            this.rootDomNodes.splice(rootIndex, 1);
        }
        this.removeDomTree(node);
    }

    removeDomTree(node: DomNodeMirror): void {
        this.domNodeMap.delete(node.id);
        for (const componentId of node.resultOf) {
            const component = this.componentMap.get(componentId);
            const resultIndex = component?.result.indexOf(node);
            if (resultIndex !== undefined && resultIndex >= 0) {
                component?.result.splice(resultIndex, 1);
            }
        }
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
        if (parentNode.connected) {
            connectDomTree(node);
        }
    }
}

function removeFromChildren(node: DomNodeMirror): void {
    const childIndex = node.parent?.children.indexOf(node);
    if (childIndex !== undefined && childIndex >= 0) {
        node.parent?.children.splice(childIndex, 1);
    }
}

function connectDomTree(node: DomNodeMirror): void {
    node.connected = true;
    for (const c of node.children) {
        connectDomTree(c);
    }
}

function disconnectDomTree(node: DomNodeMirror): void {
    delete node.connected;
    for (const c of node.children) {
        disconnectDomTree(c);
    }
}

function createRegistryMirror(logger: Logger): RegistryMirror {
    return new RegistryMirrorImpl(logger);
}

export {createRegistryMirror};
