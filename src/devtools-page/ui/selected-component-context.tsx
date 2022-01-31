

import type {Accessor, Setter} from 'solid-js';
import {createContext} from 'solid-js';

import type {ComponentData} from '../data/component-data-types';

interface SelectedComponent {
    selectedComponent: Accessor<ComponentData | undefined>;
    setSelectedComponent: Setter<ComponentData | undefined>;
}

const SelectedComponentContext = createContext<SelectedComponent>();

export {SelectedComponentContext};
