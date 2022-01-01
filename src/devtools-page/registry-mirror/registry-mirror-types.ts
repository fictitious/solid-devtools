
import type {ComponentRendered, ComponentDisposed, DomNodeRegistered, DomNodeRemoved, DomNodeIsRoot, DomNodeRootDisposed, DomNodeAddedResultOf, DomNodeInserted, DomNodeAppended} from '../../channel/channel-message-types';
import type {SerializedValue} from '../../channel/channel-transport-types';
import type {RootData, ComponentData} from '../data/component-data-types';

export type ComponentResultMirror = DomNodeMirror | ComponentResultMirror[] | undefined;

export interface ComponentMirror {
    id: string;
    name: string;
    props: SerializedValue;
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
    parentKind: 'root';
    root: RegistryRoot;
}

export interface RegistryRoot {
    domNode: DomNodeMirror;
    components: ComponentMirror[];
    rootData: RootData;
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

    clear(): void;
}
