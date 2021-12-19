
import type {Channel} from '../../channel/channel-message-types';
import type {SerializedValue} from '../../channel/serialized-value';

export type ComponentResultMirror = DomNodeMirror;

export interface ComponentMirror {
    id: string;
    name: string;
    props: SerializedValue;
    result: ComponentResultMirror[];
    connectedResultIndex?: number;
    parent?: ComponentParent;
    children: ComponentMirror[];
}

export type ComponentParent = ComponentParentComponent | ComponentParentRoot;
export interface ComponentParentComponent {
    parentKind: 'component';
    component: ComponentMirror;
}

export interface ComponentParentRoot {
    parentKind: 'root';
    root: Root;
}

export interface Root {
    domNode: DomNodeMirror;
    components: ComponentMirror[];
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
