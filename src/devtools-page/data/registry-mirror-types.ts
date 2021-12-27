
import type {Channel} from '../../channel/channel-message-types';
import type {SerializedValue} from '../../channel/serialized-value';
import type {RootData, ComponentData} from './component-data-types';

export type ComponentResultMirror = DomNodeMirror;

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

export interface RegistryMirror {
    subscribe(channel: Channel<'devtools'>): void;
    unsubscribe(channel: Channel<'devtools'>): void;
}
