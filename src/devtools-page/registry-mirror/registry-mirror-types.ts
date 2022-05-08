

import type {Accessor} from 'solid-js';

import type {
    ComponentRendered, ComponentDisposed, DomNodeRegistered, DomNodeRemoved, DomNodeIsRoot, DomNodeRootDisposed, DomNodeAddedResultOf, DomNodeInserted, DomNodeAppended, SignalCreated, SignalUpdated, SignalDisposed
} from '../../channel/channel-message-types';
import type {DomRootData, ComponentData} from '../data/component-data-types';
import type {SignalData} from '../data/signal-data-types';

export type ComponentResultMirror = DomNodeMirror | ComponentResultMirror[] | undefined;

export interface ComponentMirror {
    id: string;
    sequenceNumber: number;
    result: ComponentResultMirror[];
    connectedNodeParentId?: string;
    componentParent?: ComponentParent;
    children: ComponentMirror[];
    componentData: ComponentData;
}

export type ComponentParent = ComponentParentComponent | ComponentParentRoot;
export interface ComponentParentComponent {
    parentKind: 'component';
    component: ComponentMirror;
}

export interface ComponentParentRoot {
    parentKind: 'domroot';
    domRoot: RegistryDomRoot;
}

export interface RegistryDomRoot {
    domNode: DomNodeMirror;
    components: ComponentMirror[];
    domRootData: DomRootData;
}

export interface DomNodeMirror {
    id: string;
    nodeType: number;
    name?: string | null;
    value?: string | null;
    connected?: boolean;
    parent?: DomNodeMirror;
    children: DomNodeMirror[];
    resultOf: {id: string; sequenceNumber: number}[];
}

// omit 'messageSerial' because acks are handled by RegistryMirrorConnection
export interface RegistryMirror {
    componentRendered(p: Omit<ComponentRendered, 'messageSerial'>): void;
    componentDisposed(p: Omit<ComponentDisposed, 'messageSerial'>): void;
    domNodeRegistered(p: Omit<DomNodeRegistered, 'messageSerial'>): void;
    domNodeRemoved(p: Omit<DomNodeRemoved, 'messageSerial'>): void;
    domNodeIsRoot(p: Omit<DomNodeIsRoot, 'messageSerial'>): void;
    domNodeRootDisposed(p: Omit<DomNodeRootDisposed, 'messageSerial'>): void;
    domNodeAddedResultOf(p: Omit<DomNodeAddedResultOf, 'messageSerial'>): void;
    domNodeAppended(p: Omit<DomNodeAppended, 'messageSerial'>): void;
    domNodeInserted(p: Omit<DomNodeInserted, 'messageSerial'>): void;
    signalCreated(p: Omit<SignalCreated, 'messageSerial'>): void;
    signalUpdated(p: Omit<SignalUpdated, 'mesageSerial'>): void;
    signalDisposed(p: Omit<SignalDisposed, 'messageSerial'>): void;

    getComponent(id: string): ComponentMirror | undefined;
    domRootsData: Accessor<DomRootData[]>;
    globalSignals: Accessor<SignalData[]>;
    clear(): void;
}

export interface RegistryMirrorConnection {
    unsubscribe(): void;
}
