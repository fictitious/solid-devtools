
import type {Component} from 'solid-js';
import type {RegisterSolidInstance as SolidInstance} from 'solid-js/devtools-api';

import type {DomNodeAppended, DomNodeInserted} from '../../channel/channel-message-types';
import type {Channel} from '../../channel/channel-types';
import {serializeValue} from '../../channel/serialized-value';
import {findRegisteredDescendantsOrSelf} from './node-functions';
import {removeHotPrefix} from './component-functions';
import type {ComponentItem, ComponentProps} from './node-component-types';
import type {Registry, NodeExtra} from './registry-types';
import {solidDevtoolsKey} from './registry-types';
import {RegistryConnectionImpl} from './registry-connection';

class RegistryImpl extends RegistryConnectionImpl implements Registry {

    componentMap: Map<string, ComponentItem>;
    domNodeMap: Map<string, Node & NodeExtra>;

    constructor(
        public exposeNodeIds: boolean
    ) {
        super();
        this.componentMap = new Map();
        this.domNodeMap = new Map();
    }

    registerComponent(solidInstance: SolidInstance, comp: Component, props?: ComponentProps): ComponentItem {
        const id = newComponentId();
        const [debugBreak, setDebugBreak] = solidInstance.createSignal(false);
        const componentItem: ComponentItem = {id, comp, name: removeHotPrefix(comp.name), rawName: comp.name, props, result: [], debugBreak, setDebugBreak};
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

    registerComponentResult(result: ReturnType<Component>, index: number[], component: ComponentItem): ReturnType<Component> {
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
            if (this.exposeNodeIds) {
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

    registerRoot(node: Node & NodeExtra): void {
        const nodeExtra = this.registerDomNode(node)[solidDevtoolsKey];
        nodeExtra.isRoot = true;
        this.sendRegistryMessage('domNodeIsRoot', {id: nodeExtra.id});
    }

    unregisterRoot(node: Node & NodeExtra): void {
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

function createRegistry(exposeNodeIds: boolean): Registry {
    return new RegistryImpl(exposeNodeIds);
}

export {createRegistry};
