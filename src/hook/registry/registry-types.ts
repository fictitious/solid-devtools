
import type {JSX, Component, Setter, Computation, ComputationType, RegisterSolidInstance as SolidInstance} from 'solid-js';

import type {Channel} from '../../channel/channel-types';
import type {DomNodeAppended, DomNodeInserted, RegistryStateMessageNames, RegistryStateMessageNoSerialMap} from '../../channel/channel-message-types';
import type {NodeExtraData, ComponentItem, ComponentProps, SignalItem} from './node-component-types';

export const solidDevtoolsKey = Symbol('key for keeping solid devtools data');

export interface RegistryConnection {
    connect(channel: Channel<'page'>): void;
    reconnect(channel: Channel<'page'>): void;
    disconnect(): void;
    sendRegistryMessage<N extends RegistryStateMessageNames>(n: N, m: RegistryStateMessageNoSerialMap[N]): void;
    messageAck(serial: number): void;
}

export interface RegisterSignal {
    ownerId?: string;
    componentId?: string;
    setter: Setter<unknown>;
    name?: string;
    value: unknown;
    stack?: string;
}
export interface Registry extends RegistryConnection {
    registerComponent(comp: Component, props?: ComponentProps): ComponentItem;
    unregisterComponent(id: string): void;
    registerComponentResult(result: JSX.Element, index: number[], component: ComponentItem): JSX.Element;
    registerDomNode(node: Node & NodeExtra): Node & Required<Node & NodeExtra>;
    nodeRemoved(node: Node & NodeExtra): void;
    registerDOMRoot(node: Node & NodeExtra): void;
    unregisterDOMRoot(node: Node & NodeExtra): void;
    domNodeAppended(p: Omit<DomNodeAppended, 'messageSerial'>): void;
    domNodeInserted(p: Omit<DomNodeInserted, 'messageSerial'>): void;
    registerComputation(solidInstsance: SolidInstance, c: Computation<unknown>, type: ComputationType, componentId?: string): void;
    unregisterComputation(id: string): void;
    registerSignal(p: RegisterSignal): string;
    updateSignal(signalId: string, value: unknown): void;
    unregisterSignal(signalId: string): void;

    getComponent(id: string): ComponentItem | undefined;
    getDomNode(id: string): Node & NodeExtra | undefined;
    getSignal(id: string): SignalItem | undefined;
}

export interface RegistryOptions {
    exposeNodeIds?: boolean;
}

export type NodeExtra = {[solidDevtoolsKey]?: NodeExtraData};
