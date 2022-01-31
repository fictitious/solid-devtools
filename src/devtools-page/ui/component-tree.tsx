
import type {Accessor, Component} from 'solid-js';
import {For, useContext} from 'solid-js';

import type {RootData, ComponentData} from '../data/component-data-types';
import {SelectedComponentContext} from './selected-component-context';

const ComponentUI: Component<ComponentData> = componentData => {
    const level = componentData.level() ?? 0;
    const indent = 2 *(level - 1);
    const {selectedComponent, setSelectedComponent} = useContext(SelectedComponentContext)!;
    return <>
        <div
            onclick={[setSelectedComponent, componentData]}
            classList={{'cursor-default': true, 'bg-slate-300': componentData.id === selectedComponent()?.id}}
            style={{'padding-left': `${indent}em`}}
        >
            {`${componentData.name} id="${componentData.id}"`}
        </div>
        <For each={componentData.getChildren()}>{component => <ComponentUI {...component} />}</For>
    </>;
};

const RootUI: Component<RootData> = rootData =>
    <For each={rootData.getChildren()}>{component => <ComponentUI {...component} />}</For>
;

const ComponentTree: Component<{roots: Accessor<RootData[]>}> = props =>
    <div class="h-full w-full flex flex-col">
        <div class="w-full flex-none flex flex-row py-1">
            <div class="py-0.5 mx-3 px-3 border border-blue-400">Placeholder</div>
        </div>
        <div class="flex-auto w-full overflow-auto text-xs leading-snug">
            <For each={props.roots()}>{root => <RootUI {...root} />}</For>
        </div>
    </div>
;

export {ComponentTree};
