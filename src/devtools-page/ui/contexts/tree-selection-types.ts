
import type {Accessor} from 'solid-js';

import type {ComponentData} from '../../data/component-data-types';
import type {SignalData} from '../../data/signal-data-types';

export interface SelectedComponent {
    selectionType: 'component';
    componentData: ComponentData;
}

export interface SelectedGlobalSignals {
    selectionType: 'globalSignals';
    globalSignals: Accessor<SignalData[]>;
}

export type TreeSelection = SelectedComponent | SelectedGlobalSignals;
