

import type {Accessor, Setter} from 'solid-js';
import {createContext, useContext} from 'solid-js';

import type {TreeSelection} from './tree-selection-types';

interface ComponentTreeSelection {
    treeSelection: Accessor<TreeSelection | undefined>;
    setTreeSelection: Setter<TreeSelection | undefined>;
}

const ComponentTreeSelectionContext = createContext<ComponentTreeSelection>();

const selectedComponent = () => {
    const s = useContext(ComponentTreeSelectionContext)?.treeSelection();
    return s && s.selectionType === 'component' ? s.componentData : undefined;
};
const selectedGlobalSignals = () => {
    const s = useContext(ComponentTreeSelectionContext)?.treeSelection();
    return s && s.selectionType === 'globalSignals' ? s.globalSignals : undefined;
};

export {ComponentTreeSelectionContext, selectedComponent, selectedGlobalSignals};
