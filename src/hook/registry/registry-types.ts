
import type {Component} from 'solid-js';
import type {RegisterSolidInstance as SolidInstance} from 'solid-js/devtools-api';

import type {Channel} from '../../channel/channel-types';
import type {DomNodeAppended, DomNodeInserted, RegistryStateMessageNames, RegistryStateMessageNoSerialMap} from '../../channel/channel-message-types';
import type {NodeExtraData, ComponentItem, ComponentProps} from './node-component-types';

export const solidDevtoolsKey = Symbol('key for keeping solid devtools data');

export interface RegistryConnection {
    connect(channel: Channel<'page'>): void;
    reconnect(channel: Channel<'page'>): void;
    disconnect(): void;
    sendRegistryMessage<N extends RegistryStateMessageNames>(n: N, m: RegistryStateMessageNoSerialMap[N]): void;
    messageAck(serial: number): void;
}

export interface Registry extends RegistryConnection {
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
    getDomNode(id: string): Node & NodeExtra | undefined;
}

export type NodeExtra = {[solidDevtoolsKey]?: NodeExtraData};
