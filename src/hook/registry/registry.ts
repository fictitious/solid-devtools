
import type {JSX, Component, Computation, ComputationType, RegisterSolidInstance as SolidInstance} from 'solid-js';

import type {DomNodeAppended, DomNodeInserted} from '../../channel/channel-message-types';
import type {Channel} from '../../channel/channel-types';
import {serializeValue} from '../../channel/serialized-value';
import {findRegisteredDescendantsOrSelf} from './node-functions';
import {removeHotPrefix} from './component-functions';
import type {ComponentItem, ComponentProps, SignalItem} from './node-component-types';
import type {Registry, RegisterSignal, NodeExtra, RegistryOptions} from './registry-types';
import {solidDevtoolsKey} from './registry-types';
import {RegistryConnectionImpl} from './registry-connection';
import {getOwnerDevtoolsData} from './reactive-functions';

class RegistryImpl extends RegistryConnectionImpl implements Registry {

    componentMap: Map<string, ComponentItem>;
    domNodeMap: Map<string, Node & NodeExtra>;
    computationMap: Map<string, Computation<unknown>>;
    signalMap: Map<string, SignalItem>;

    constructor(
        public options: RegistryOptions
    ) {
        super();
        this.componentMap = new Map();
        this.domNodeMap = new Map();
        this.computationMap = new Map();
        this.signalMap = new Map();
    }

    registerComponent(comp: Component, props?: ComponentProps): ComponentItem {
        const id = newComponentId();
        const componentItem: ComponentItem = {id, comp: comp, name: removeHotPrefix(comp.name), rawName: comp.name, props, result: []};
        this.componentMap.set(id, componentItem);
        this.sendRegistryMessage('componentRendered', {id, name: componentItem.name, rawName: componentItem.rawName, props: serializeValue(props)});
        return componentItem;
    }

    unregisterComponent(id: string): void {
        this.componentMap.delete(id);
        this.sendRegistryMessage('componentDisposed', {id});
    }

    getComponent(id: string): ComponentItem | undefined {
        return this.componentMap.get(id);
    }

    getDomNode(id: string): Node & NodeExtra | undefined {
        return this.domNodeMap.get(id);
    }

    getSignal(id: string): SignalItem | undefined {
        return this.signalMap.get(id);
    }

    registerComponentResult(result: JSX.Element, index: number[], component: ComponentItem): JSX.Element {
        if (result instanceof Node) { // TODO handle primitive types (string / number etc - needs more patching in solid insertParent)
            const node = this.registerDomNode(result as Node & NodeExtra);
            const nodeExtra = node[solidDevtoolsKey];
            if (nodeExtra.resultOf) {
                nodeExtra.resultOf.push(component.id);
            } else {
                nodeExtra.resultOf = [component.id];
            }
            this.sendRegistryMessage('domNodeAddedResultOf', {id: nodeExtra.id, resultOf: component.id, index});
            let i = 0;
            let array = component.result;
            let si = index[i];
            let v = array[si];
            while (i < index.length - 1) {
                if (!Array.isArray(v)) {
                    v = array[si] = [];
                }
                array = v;
                si = index[i];
                v = array[si];
                ++i;
            }
            array[si] = nodeExtra.id;
        }
        return result;
    }

    registerDomNode(node: Node & NodeExtra): Node & Required<Node & NodeExtra> {
        const nodeExtra = node[solidDevtoolsKey];
        if (!nodeExtra) {
            const id = newDomNodeId();
            node[solidDevtoolsKey] = {id};
            if (this.options.exposeNodeIds) {
                (node instanceof HTMLElement) && node.setAttribute('data-devtools-id', id);
            }

            this.domNodeMap.set(id, node);
            this.sendRegistryMessage('domNodeRegistered', {id, nodeType: node.nodeType, name: node.nodeName, value: node.nodeValue});
        }
        return node as Node & Required<Node & NodeExtra>;
    }

    nodeRemoved(node: Node & NodeExtra): void {
        const rc = findRegisteredDescendantsOrSelf(node);
        for (const e of rc) {
            this.sendRegistryMessage('domNodeRemoved', {id: e[solidDevtoolsKey].id});
        }
        this.unregisterDomTree(node);
    }

    registerDOMRoot(node: Node & NodeExtra): void {
        const nodeExtra = this.registerDomNode(node)[solidDevtoolsKey];
        nodeExtra.isRoot = true;
        this.sendRegistryMessage('domNodeIsRoot', {id: nodeExtra.id});
    }

    unregisterDOMRoot(node: Node & NodeExtra): void {
        const nodeExtra = node[solidDevtoolsKey];
        if (nodeExtra) {
            delete nodeExtra.isRoot;
            if (!nodeExtra.resultOf) {
                this.domNodeMap.delete(nodeExtra.id);
            }
            this.sendRegistryMessage('domNodeRootDisposed', {id: nodeExtra.id});
        }
    }

    domNodeAppended({parentId, childIds}: Omit<DomNodeAppended, 'messageSerial'>): void {
        this.sendRegistryMessage('domNodeAppended', {parentId, childIds});
    }

    domNodeInserted({parentId, childIds, prevId, nextId}: Omit<DomNodeInserted, 'messageSerial'>): void {
        this.sendRegistryMessage('domNodeInserted', {parentId, childIds, prevId, nextId});
    }

    registerComputation(solidInstance: SolidInstance, c: Computation<unknown>, type: ComputationType, componentId?: string): void {
        const id = newComputationId();
        c.devtoolsData = {type, id, componentId};
        if (!componentId) {
            const ownerData = getOwnerDevtoolsData(c.owner);
            if (ownerData) {
                c.devtoolsData.componentId = ownerData.componentId;
            }
        }
        this.computationMap.set(id, c);
        solidInstance.onCleanup(() => this.unregisterComputation(id));
    }

    unregisterComputation(id: string): void {
        const computationItem = this.computationMap.get(id);
        if (computationItem) {
            this.computationMap.delete(id);
            if (computationItem.devtoolsData?.ownedSignalIds) {
                for (const signalId of computationItem.devtoolsData.ownedSignalIds) {
                    this.unregisterSignal(signalId);
                }
            }
        }
    }

    registerSignal({ownerId, componentId, setter, name, value, stack}: RegisterSignal): string {
        const signalItem: SignalItem = {id: newSignalId(), ownerId, componentId, setter, name, value, stack};
        this.signalMap.set(signalItem.id, signalItem);
        this.sendRegistryMessage('signalCreated', {signalId: signalItem.id, ownerId, componentId, name, value: serializeValue(value)});
        return signalItem.id;
    }

    updateSignal(signalId: string, value: unknown): void {
        const signalItem = this.signalMap.get(signalId);
        if (signalItem) {
            signalItem.value = value;
            this.sendRegistryMessage('signalUpdated', {signalId: signalItem.id, ownerId: signalItem.ownerId, componentId: signalItem.componentId, value: serializeValue(value)});
        }
    }

    unregisterSignal(signalId: string): void {
        const signalItem = this.signalMap.get(signalId);
        if (signalItem) {
            this.sendRegistryMessage('signalDisposed', {signalId: signalItem.id, ownerId: signalItem.ownerId, componentId: signalItem.componentId});
            this.signalMap.delete(signalItem.id);
        }
    }

    unregisterDomTree(node: Node & NodeExtra) {
        this.unregisterDomNode(node);
        let c = node.firstChild;
        while (c) {
            this.unregisterDomTree(c);
            c = c.nextSibling;
        }
    }

    unregisterDomNode(node: Node & NodeExtra): void {
        const nodeExtra = node[solidDevtoolsKey];
        if (nodeExtra) {
            const id = nodeExtra.id;
            this.domNodeMap.delete(id);
            delete node[solidDevtoolsKey];
        }
    }

    sendSnapshot(channel: Channel<'page'>): void {
        const rootNodes: (Node & Required<NodeExtra>)[] = [];
        for (const node of this.domNodeMap.values()) {
            const nodeExtra = node[solidDevtoolsKey];
            if (nodeExtra) {
                const message = {nodeType: node.nodeType, name: node.nodeName, ...nodeExtra};
                channel.send('snapshotDomNode', message);
                if (nodeExtra.isRoot) {
                    rootNodes.push(node as Node & Required<NodeExtra>);
                }
            }
        }
        for (const componentItem of this.componentMap.values()) {
            const {id, name, rawName, result} = componentItem;
            const message = {id, name, rawName, result, props: serializeValue(componentItem.props)};
            channel.send('snapshotComponent', message);
        }
        rootNodes.forEach(n => sendDomNodeAppendedSnapshot(n, channel));
        for (const signalItem of this.signalMap.values()) {
            channel.send('snapshotSignal', {signalId: signalItem.id, ownerId: signalItem.ownerId, componentId: signalItem.componentId, name: signalItem.name, value: serializeValue(signalItem.value)});
        }
        channel.send('snapshotCompleted', {});
    }
}

function sendDomNodeAppendedSnapshot(node: Node & Required<NodeExtra>, channel: Channel<'page'>): void {
    const children = Array.prototype.flatMap.call(node.childNodes, findRegisteredDescendantsOrSelf) as (Node & Required<NodeExtra>)[];
    if (children.length) {
        const message = {parentId: node[solidDevtoolsKey].id, childIds: children.map(c => c[solidDevtoolsKey].id)};
        channel.send('snapshotDomNodeAppended', message);
        children.forEach(c => sendDomNodeAppendedSnapshot(c, channel));
    }
}

let nextId = 0;

function newComponentId(): string {
    return `c-${++nextId}`;
}

function newDomNodeId(): string {
    return `d-${++nextId}`;
}

function newSignalId(): string {
    return `s-${++nextId}`;
}

function newComputationId(): string {
    return `o-${++nextId}`;
}

function createRegistry(options: RegistryOptions): Registry {
    return new RegistryImpl(options);
}

export {createRegistry};
