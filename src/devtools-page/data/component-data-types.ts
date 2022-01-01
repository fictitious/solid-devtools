
import type {Accessor, Setter} from 'solid-js';

import type {SerializedValue} from '../../channel/channel-transport-types';

/*
naive (non-optimized) reactive data type structures for showing component tree
*/

export interface ComponentChildrenData {
    getChildren: Accessor<ComponentData[]>;
    setChildren: Setter<ComponentData[]>;
    level: Accessor<number | undefined>;
}

export interface RootData extends ComponentChildrenData {
    level: Accessor<0>;
    domNodeId: string;
}

export interface ComponentData extends ComponentChildrenData {
    id: string;
    name: string;
    props: SerializedValue;
}

export interface RootsData {
    roots: Accessor<RootData[]>;
    setRoots: Setter<RootData[]>;
}
