
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
    rawName: string;
    props: SerializedValue;
    getSignals: Accessor<SignalData[]>;
    setSignals: Setter<SignalData[]>;
    watchingSignals: Accessor<boolean>;
    setWatchingSignals: Setter<boolean>;
}

export interface SignalData {
    id: string;
    name?: string;
    value: SerializedValue;
}

export interface RootsData {
    roots: Accessor<RootData[]>;
    setRoots: Setter<RootData[]>;
}
