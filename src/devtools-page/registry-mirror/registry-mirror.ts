
import type {Accessor, Setter} from 'solid-js';
import {createSignal} from 'solid-js';

import type {
    ComponentRendered, ComponentDisposed, DomNodeRegistered, DomNodeRemoved, DomNodeIsRoot, DomNodeRootDisposed, DomNodeAddedResultOf, DomNodeInserted, DomNodeAppended, SignalCreated, SignalUpdated, SignalDisposed
} from '../../channel/channel-message-types';
import type {Logger} from '../data/logger-types';
import type {DomRootData} from '../data/component-data-types';
import {createDomRoot, createComponent} from '../data/component-data';
import type {SignalData} from '../data/signal-data-types';
import {addSignal, updateSignal, removeSignal} from '../data/signal-data';
import type {ComponentMirror, ComponentResultMirror, DomNodeMirror, RegistryDomRoot, RegistryMirror} from './registry-mirror-types';
import {connectDomTree, disconnectDomTree, connectedResultAdded, findAndConnectToParentComponent, removeComponentFromTree, removeDomNodeFromComponentResult} from './connect-components';

class RegistryMirrorImpl implements RegistryMirror {

    componentMap: Map<string, ComponentMirror>;
    domRoots: RegistryDomRoot[];
    domNodeMap: Map<string, DomNodeMirror>;
    public domRootsData: Accessor<DomRootData[]>;
    setDomRootsData: Setter<DomRootData[]>;
    public globalSignals: Accessor<SignalData[]>;
    setGlobalSignals: Setter<SignalData[]>;

    constructor(
        public logger: Logger
    ) {
        this.componentMap = new Map();
        this.domRoots = [];
        this.domNodeMap = new Map();
        [this.domRootsData, this.setDomRootsData] = createSignal([]);
        [this.globalSignals, this.setGlobalSignals] = createSignal([]);
    }

    getComponent(id: string): ComponentMirror | undefined {
        return this.componentMap.get(id);
    }

    componentRendered = (p: ComponentRendered) => {
        if (this.componentMap.has(p.id)) {
            this.logger('error', `RegistryMirror.componentRendered: component is already here. id=${p.id}`);
        } else {
            const component = createComponent(p);
            this.componentMap.set(p.id, component);
        }
    };

    componentDisposed = ({id}: ComponentDisposed) => {
        const component = this.componentMap.get(id);
        if (!component) {
            this.logger('error', `RegistryMirror.componentDisposed: unknown component id: ${id}`);
        } else {
            updateNodesResultOf(component.result, id);
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
            const rootIndex = this.domRoots.findIndex(r => r.domNode === node);
            if (rootIndex < 0) {
                const components = connectDomTree(this.componentMap, this.logger, node);
                const domRoot = createDomRoot(this.setDomRootsData, node, components);
                for (const component of domRoot.components) {
                    component.componentParent = {parentKind: 'domroot', domRoot};
                }
                this.domRoots.push(domRoot);
            }
        }
    };

    domNodeRootDisposed = ({id}: DomNodeRootDisposed) => {
        const node = this.domNodeMap.get(id);
        if (!node) {
            this.logger('error', `RegistryMirror.domNodeRootDisposed: unknown dom node id: ${id}`);
        } else {
            const rootIndex = this.domRoots.findIndex(r => r.domNode === node);
            if (rootIndex < 0) {
                this.logger('error', `RegistryMirror.domNodeRootDisposed: dom node is not root. id=${id}`);
            } else {
                this.domRoots.splice(rootIndex, 1);
                disconnectDomTree(node);
            }
        }
    };

    domNodeAddedResultOf = ({id, resultOf, index}: DomNodeAddedResultOf) => {
        const node = this.domNodeMap.get(id);
        if (!node) {
            this.logger('error', `RegistryMirror.domNodeAddedResultOf: unknown dom node id: ${id}`);
        } else {
            const component = this.componentMap.get(resultOf);
            if (!component) {
                this.logger('error', `RegistryMirror.domNodeAddedResultOf: unknown component id: ${resultOf}`);
            } else {
                // connect-components code assumes that resultOf is sorted according to the component position in the tree from bottom to top
                // this is maintained here, relying on the fact that upper components are rendered before lower
                // so it's enough to keep it in descending order of component sequenceNumbers

                let indexInResult = node.resultOf.findIndex(r => r.id === resultOf);
                if (indexInResult < 0) {
                    const sequenceNumber = component.sequenceNumber;
                    if (node.resultOf.length === 0 || sequenceNumber < node.resultOf[node.resultOf.length - 1].sequenceNumber) {
                        node.resultOf.push({id: resultOf, sequenceNumber});
                        indexInResult = node.resultOf.length - 1;
                    } else {
                        indexInResult = node.resultOf.length - 1;
                        while (indexInResult > 0 && sequenceNumber > node.resultOf[indexInResult - 1].sequenceNumber) {
                            --indexInResult;
                        }
                        node.resultOf.splice(indexInResult, 0, {id: resultOf, sequenceNumber});
                    }
                }

                updateComponentResult(component, index, node);

                if (node.connected && !component.componentParent) {
                    connectedResultAdded(this.domRoots, this.componentMap, this.logger, component, node, indexInResult);
                }
            }
        }
    };

    domNodeAppended = ({parentId, childIds}: DomNodeAppended) => {
        const {parentNode, childNodes} = this.findParentChildNodes('RegistryMirror.domNodeAppended', parentId, childIds);
        childNodes.forEach(removeNodeFromChildren);
        if (parentNode) {
            parentNode.children.push(...childNodes);
            assignNodeParent(parentNode, childNodes);
            if (parentNode.connected) {
                const components = childNodes.flatMap(childNode => connectDomTree(this.componentMap, this.logger, childNode));
                // 1. there may be duplicates in components returned by connectDomTree
                // 2. (while this code still can't handle portals) - component can be reachable via different ways
                //    for example child dom node X is a result of Comp B
                //    child dom node Y is a result of both comp B and comp A, and B is below A
                //    components returned by connectDomTree here will contain both comp B and comp A but comp B
                //    will already have A as a parent through their node Y result
                //  The code in connectNodeResultOf is assinging parent only if it's not assigned yet, avoiding these problems
                //  here they need to be avoided too
                const filtered: ComponentMirror[] = [];
                for (const c of components) {
                    if (!c.componentParent && !filtered.includes(c)) {
                        filtered.push(c);
                    }
                }
                if (filtered.length) {
                    findAndConnectToParentComponent({
                        domRoots: this.domRoots,
                        componentMap: this.componentMap,
                        logger: this.logger,
                        parentNode,
                        components: filtered,
                        prevSiblingIndex: parentNode.children.length - childNodes.length - 1,
                        nextSiblingIndex:  parentNode.children.length
                    });
                }
            }
        }
    };

    domNodeInserted = ({parentId, childIds, prevId, nextId}: DomNodeInserted) => {
        const {parentNode, childNodes} = this.findParentChildNodes('RegistryMirror.domNodeInserted', parentId, childIds);
        childNodes.forEach(removeNodeFromChildren);
        if (parentNode) {
            const index = this.validateInsertionIndex({parentNode, prevId, nextId});
            if (index !== undefined) {
                parentNode.children.splice(index, 0, ...childNodes);
                assignNodeParent(parentNode, childNodes);
                if (parentNode.connected) {
                    const components = childNodes.flatMap(childNode => connectDomTree(this.componentMap, this.logger, childNode));
                    const filtered: ComponentMirror[] = [];
                    for (const c of components) {
                        if (!c.componentParent && !filtered.includes(c)) {
                            filtered.push(c);
                        }
                    }
                    if (filtered.length) {
                        findAndConnectToParentComponent({
                            domRoots: this.domRoots,
                            componentMap: this.componentMap,
                            logger: this.logger,
                            parentNode,
                            components: filtered,
                            prevSiblingIndex: index - 1,
                            nextSiblingIndex: index + childNodes.length
                        });
                    }
                }
            }
        }
    };

    signalCreated = ({signalId, componentId, name, value}: SignalCreated) => {
        const componentMirror = componentId && this.componentMap.get(componentId);
        const setSignals = componentMirror ? componentMirror.componentData.setSignals : this.setGlobalSignals;
        addSignal({setSignals, signalId, name, value});
    };

    signalUpdated = ({signalId, componentId, value}: SignalUpdated) => {
        const componentMirror = componentId && this.componentMap.get(componentId);
        const setSignals = componentMirror ? componentMirror.componentData.setSignals : this.setGlobalSignals;
        updateSignal(setSignals, signalId, value);
    };

    signalDisposed = ({signalId, componentId}: SignalDisposed) => {
        const componentMirror = componentId && this.componentMap.get(componentId);
        const setSignals = componentMirror ? componentMirror.componentData.setSignals : this.setGlobalSignals;
        removeSignal(setSignals, signalId);
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
        removeNodeFromChildren(node);
        const rootIndex = this.domRoots.findIndex(r => r.domNode === node);
        if (rootIndex >= 0) {
            this.domRoots.splice(rootIndex, 1);
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

    clear() {
        this.componentMap.clear();
        this.domRoots.length = 0;
        this.domNodeMap.clear();
        this.setDomRootsData([]);
        this.setGlobalSignals([]);
    }
}

function assignNodeParent(parentNode: DomNodeMirror, childNodes: DomNodeMirror[]): void {
    for (const node of childNodes) {
        node.parent = parentNode;
    }
}

function removeNodeFromChildren(node: DomNodeMirror): void {
    const childIndex = node.parent?.children.indexOf(node);
    if (childIndex !== undefined && childIndex >= 0) {
        node.parent?.children.splice(childIndex, 1);
    }
}

function updateNodesResultOf(result: ComponentResultMirror[], componentId: string): void {
    for (const r of result) {
        if (Array.isArray(r)) {
            updateNodesResultOf(r, componentId);
        } else if (r) {
            const resultIndex = r.resultOf.findIndex(rc => rc.id === componentId);
            if (resultIndex >= 0) {
                r.resultOf.splice(resultIndex, 1);
            }
        }
    }
}

function updateComponentResult(component: ComponentMirror, multiIndex: number[], node: DomNodeMirror): void {
    let array = component.result;
    let index = multiIndex[0];
    let v = array[index];
    const removedNodes: DomNodeMirror[] = [];
    for (let i = 0; i < multiIndex.length - 1; ++i) {
        if (!Array.isArray(v)) {
            if (v && v !== node) {
                removedNodes.push(v);
            }
            v = array[index] = [];
        }
        array = v;
        index = multiIndex[i + 1];
        v = array[index];
    }

    if (Array.isArray(v)) {
        collectResultNodes(v, node, removedNodes);
    } else if (v && v !== node) {
        removedNodes.push(v);
    }
    array[index] = node;
    updateNodesResultOf(removedNodes, component.id);
}

function collectResultNodes(result: ComponentResultMirror[], node: DomNodeMirror, nodes: DomNodeMirror[]) {
    for (const r of result) {
        if (Array.isArray(r)) {
            collectResultNodes(r, node, nodes);
        } else if (r && r !== node) {
            nodes.push(r);
        }
    }
}

function createRegistryMirror(logger: Logger): RegistryMirror {
    return new RegistryMirrorImpl(logger);
}

export {createRegistryMirror};
