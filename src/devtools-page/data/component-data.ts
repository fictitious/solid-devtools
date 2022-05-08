
import type {Setter} from 'solid-js';
import {createSignal} from 'solid-js';

import type {SerializedValue} from '../../channel/channel-transport-types';
import type {RegistryDomRoot, DomNodeMirror, ComponentMirror} from '../registry-mirror/registry-mirror-types';
import type {DomRootData, ComponentData, ComponentChildrenData} from './component-data-types';

import type {SignalData} from './signal-data-types';

/*
naive (non-optimized) reactive data for showing component tree
*/

function createDomRoot(setDomRootsData: Setter<DomRootData[]>, domNode: DomNodeMirror, components: ComponentMirror[]): RegistryDomRoot {
    const [getChildren, setChildren] = createSignal<ComponentData[]>(components.map(c => c.componentData));
    const domRootData: DomRootData = {domNodeId: domNode.id, getChildren, setChildren, level: () => 0};
    const domRoot = {domNode, components, domRootData};
    setDomRootsData(domRootsData => [...domRootsData, domRootData]);
    return domRoot;
}

let lastComponentSequenceNumber = 0;
interface CreateComponent {
    id: string;
    name: string;
    rawName: string;
    props: SerializedValue;
}
function createComponent({id, name, rawName, props}: CreateComponent): ComponentMirror {
    const [getChildren, setChildren] = createSignal<ComponentData[]>([]);
    const [getSignals, setSignals] = createSignal<SignalData[]>([]);
    const componentData: ComponentData = {id, name, rawName, props, getChildren, setChildren, getSignals, setSignals, level: () => undefined};
    return {id, sequenceNumber: ++lastComponentSequenceNumber, componentData, result: [], children: []};
}

function updateChildrenData(childrenData: ComponentChildrenData, children: ComponentMirror[]): void {
    const level = () => 1 + (childrenData.level() ?? 0);
    childrenData.setChildren(children.map(c => Object.assign(c.componentData, {level})));
}

export {createDomRoot, createComponent, updateChildrenData};
