
import type {Component} from 'solid-js';

import type {Channel} from '../../channel/channel-types';
import type {DomNodeAppended, DomNodeInserted, RegistryStateMessageNames, RegistryStateMessageNoSerialMap} from '../../channel/channel-message-types';
import type {solidDevtoolsKey} from './node-functions';
import type {NodeExtraData, ComponentItem, ComponentProps, SolidInstance} from './node-component-types';


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
}

export type NodeExtra = {[solidDevtoolsKey]?: NodeExtraData};
