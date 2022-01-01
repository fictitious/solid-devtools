
import {createSignal} from 'solid-js';

import type {SerializedValue} from '../../channel/channel-transport-types';
import type {RegistryRoot, DomNodeMirror, ComponentMirror} from '../registry-mirror/registry-mirror-types';
import type {RootsData, RootData, ComponentData, ComponentChildrenData} from './component-data-types';

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
    props: SerializedValue;
}
function createComponent({id, name, props}: CreateComponent): ComponentMirror {
    const [getChildren, setChildren] = createSignal<ComponentData[]>([]);
    const componentData: ComponentData = {id, name, props, getChildren, setChildren, level: () => undefined};
    return {id, name, props, componentData, result: [], children: []};
}

function updateChildrenData(childrenData: ComponentChildrenData, children: ComponentMirror[]): void {
    const level = () => 1 + (childrenData.level() ?? 0);
    childrenData.setChildren(children.map(c => Object.assign(c.componentData, {level})));
}

export {createRoots, createRoot, createComponent, updateChildrenData};
