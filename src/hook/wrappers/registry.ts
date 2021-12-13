
import type {Component} from 'solid-js';

import type {Channel} from '../../channel/channel-message-types';
import {serializeValue} from '../../channel/serialized-value';
import type {ComponentItem, ComponentProps} from './types';

export interface Registry {
    registerComponent(comp: Component, props?: ComponentProps): ComponentItem;
    unregisterComponent(id: string): void;
    registerComponentResult<R>(result: R, index: number[], component: ComponentItem): R;
    registerDomNode(node: Node & NodeExtra): Node & Required<Node & NodeExtra>;
    unregisterDomNode(node: Node & NodeExtra): void;
    registerRoot(node: Node & NodeExtra): void;
    unregisterRoot(node: Node & NodeExtra): void;
}

const solidDevtoolsKey = Symbol('key for keeping solid devtools data');

export type NodeExtra = {[solidDevtoolsKey]?: {id: string; resultOf?: ComponentItem[]; isRoot?: true}};

class RegistryImpl implements Registry {

    componentMap: Map<string, ComponentItem>;
    domNodeMap: Map<string, Node & NodeExtra>;

    constructor(
        public channel: Channel<'page'>,
        public exposeNodeIds: boolean
    ) {
        this.componentMap = new Map();
        this.domNodeMap = new Map();
    }

    registerComponent(comp: Component, props?: ComponentProps): ComponentItem {
        const id = newComponentId();
        const componentItem: ComponentItem = {id, comp, name: comp.name, props};
        this.componentMap.set(id, componentItem);
        this.channel.send('componentRendered', {id, name: comp.name, props: serializeValue(props)});
        return componentItem;
    }

    unregisterComponent(id: string): void {
        this.componentMap.delete(id);
        this.channel.send('componentDisposed', {id});
    }

    registerComponentResult<R>(result: R, index: number[], component: ComponentItem): R {
        if (result instanceof Node) {
            const node = this.registerDomNode(result as Node & NodeExtra);
            const nodeExtra = node[solidDevtoolsKey];
            if (nodeExtra.resultOf) {
                nodeExtra.resultOf.push(component);
            } else {
                nodeExtra.resultOf = [component];
            }
            this.channel.send('domNodeAddedResultOf', {id: nodeExtra.id, resultOf: component.id, index});
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
            this.channel.send('domNodeRegistered', {id, nodeType: node.nodeType, name: node.nodeName, value: node.nodeValue});
        }
        return node as Node & Required<Node & NodeExtra>;
    }

    unregisterDomNode(node: Node & NodeExtra): void {
        const nodeExtra = node[solidDevtoolsKey];
        if (nodeExtra) {
            const id = nodeExtra.id;
            this.domNodeMap.delete(id);
            delete node[solidDevtoolsKey];
        }
    }

    registerRoot(node: Node & NodeExtra): void {
        const nodeExtra = this.registerDomNode(node)[solidDevtoolsKey];
        nodeExtra.isRoot = true;
        this.channel.send('domNodeIsRoot', {id: nodeExtra.id});
    }

    unregisterRoot(node: Node & NodeExtra): void {
        const nodeExtra = node[solidDevtoolsKey];
        if (nodeExtra) {
            delete nodeExtra.isRoot;
            if (!nodeExtra.resultOf) {
                this.domNodeMap.delete(nodeExtra.id);
            }
            this.channel.send('domNodeRootDisposed', {id: nodeExtra.id});
        }
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

export {createRegistry, solidDevtoolsKey};
