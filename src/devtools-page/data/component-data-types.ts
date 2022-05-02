
import type {Accessor, Setter} from 'solid-js';

import type {SerializedValue} from '../../channel/channel-transport-types';

import type {SignalData} from './signal-data-types';

/*
naive (non-optimized) reactive data type structures for showing component tree
*/

export interface ComponentChildrenData {
    getChildren: Accessor<ComponentData[]>;
    setChildren: Setter<ComponentData[]>;
    level: Accessor<number | undefined>;
}

export interface DomRootData extends ComponentChildrenData {
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
}
