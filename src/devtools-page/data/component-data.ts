
import type {Setter} from 'solid-js';
import {createSignal} from 'solid-js';

import type {SerializedValue} from '../../channel/channel-transport-types';
import type {RegistryRoot, DomNodeMirror, ComponentMirror} from '../registry-mirror/registry-mirror-types';
import type {RootsData, RootData, ComponentData, ComponentChildrenData, SignalData} from './component-data-types';

/*
naive (non-optimized) reactive data for showing component tree
*/

function createRoots(): RootsData {
    const [roots, setRoots] = createSignal<RootData[]>([]);
    return {roots, setRoots};
}

function createRoot(rootsData: RootsData, domNode: DomNodeMirror, components: ComponentMirror[]): RegistryRoot {
    const [getChildren, setChildren] = createSignal<ComponentData[]>(components.map(c => c.componentData));
    const rootData: RootData = {domNodeId: domNode.id, getChildren, setChildren, level: () => 0};
    const root = {domNode, components, rootData} as RegistryRoot;
    rootsData.setRoots(roots => [...roots, rootData]);
    return root;
}

interface CreateComponent {
    id: string;
    name: string;
    rawName: string;
    props: SerializedValue;
}
function createComponent({id, name, rawName, props}: CreateComponent): ComponentMirror {
    const [getChildren, setChildren] = createSignal<ComponentData[]>([]);
    const [getSignals, setSignals] = createSignal<SignalData[]>([]);
    const [watchingSignals, setWatchingSignals] = createSignal(false);
    const componentData: ComponentData = {id, name, rawName, props, getChildren, setChildren, getSignals, setSignals, watchingSignals, setWatchingSignals, level: () => undefined};
    return {id, componentData, result: [], children: []};
}

function updateChildrenData(childrenData: ComponentChildrenData, children: ComponentMirror[]): void {
    const level = () => 1 + (childrenData.level() ?? 0);
    childrenData.setChildren(children.map(c => Object.assign(c.componentData, {level})));
}

interface AddSignal {
    setSignals: Setter<SignalData[]>;
    signalId: string;
    name?: string;
    value: SerializedValue;
}
function addSignal({setSignals, signalId, name, value}: AddSignal): void {
    setSignals(signals => [...signals, {id: signalId, name, value}]);
}

function updateSignal(setSignals: Setter<SignalData[]>, signalId: string, value: SerializedValue): void {
    setSignals(signals => signals.map(s => s.id === signalId ? {...s, value} : s));
}

function removeSignal(setSignals: Setter<SignalData[]>, signalId: string): void {
    setSignals(signals => signals.filter(s => s.id !== signalId));
}

export {createRoots, createRoot, createComponent, updateChildrenData, addSignal, updateSignal, removeSignal};
