
import type {Component} from 'solid-js';

import type {Channel, DomNodeAppended, DomNodeInserted, RegistryStateMessageNames, RegistryStateMessageNoSerialMap, FromPage} from '../../channel/channel-message-types';
import {serializeValue} from '../../channel/serialized-value';
import {solidDevtoolsKey, findRegisteredDescendantsOrSelf} from './node-functions';
import type {NodeExtraData, ComponentItem, ComponentProps, SolidInstance} from './types';

export interface Registry {
    registerComponent(solidInstance: SolidInstance, comp: Component, props?: ComponentProps): ComponentItem;
    unregisterComponent(id: string): void;
    registerComponentResult(result: ReturnType<Component>, index: number[], component: ComponentItem): ReturnType<Component>;
    registerDomNode(node: Node & NodeExtra): Node & Required<Node & NodeExtra>;
    nodeRemoved(node: Node & NodeExtra): void;
    registerRoot(node: Node & NodeExtra): void;
    unregisterRoot(node: Node & NodeExtra): void;
    domNodeAppended(p: Omit<DomNodeAppended, 'messageSerial'>): void;
    domNodeInserted(p: Omit<DomNodeInserted, 'messageSerial'>): void;

    getComponent(id: string): ComponentItem | undefined;
}

export type NodeExtra = {[solidDevtoolsKey]?: NodeExtraData};

class RegistryImpl implements Registry {

    componentMap: Map<string, ComponentItem>;
    domNodeMap: Map<string, Node & NodeExtra>;
    messageSerial: number;

    constructor(
        public channel: Channel<'page'>,
        public exposeNodeIds: boolean
    ) {
        this.componentMap = new Map();
        this.domNodeMap = new Map();
        this.messageSerial = 0;
    }

    registerComponent(solidInstance: SolidInstance, comp: Component, props?: ComponentProps): ComponentItem {
        const id = newComponentId();
        const [debugBreak, setDebugBreak] = solidInstance.createSignal(false);
        const componentItem: ComponentItem = {id, comp, name: comp.name, props, result: [], debugBreak, setDebugBreak};
        this.componentMap.set(id, componentItem);
        this.sendRegistryMessage('componentRendered', {id, name: comp.name, props: serializeValue(props)});
        return componentItem;
    }

    unregisterComponent(id: string): void {
        this.componentMap.delete(id);
        this.sendRegistryMessage('componentDisposed', {id});
    }

    getComponent(id: string): ComponentItem | undefined {
        return this.componentMap.get(id);
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

    sendRegistryMessage<N extends RegistryStateMessageNames>(n: N, m: RegistryStateMessageNoSerialMap[N]): void {
        this.channel.send(n, {...m, messageSerial: this.nextMessageSerial()} as FromPage[N][0]);
    }

    nextMessageSerial() {
        return ++this.messageSerial;
    }
}

let nextId = 0;

function newComponentId(): string {
    return `c-${++nextId}`;
}

function newDomNodeId(): string {
    return `d-${++nextId}`;
}

function createRegistry(channel: Channel<'page'>, exposeNodeIds: boolean): Registry {
    return new RegistryImpl(channel, exposeNodeIds);
}

export {createRegistry};
