
import type {Accessor, Component} from 'solid-js';
import {For, useContext} from 'solid-js';

import type {RootData, ComponentData} from '../data/component-data-types';
import {SelectedComponentContext} from './contexts/selected-component-context';
import {OptionsContext} from './contexts/options-context';

const ComponentUI: Component<ComponentData> = componentData => {
    const level = componentData.level() ?? 0;
    const indent = 1.5 * (level - 1);
    const {selectedComponent, setSelectedComponent} = useContext(SelectedComponentContext)!;
    const isSelected = () => componentData.id === selectedComponent()?.id;
    const exposeIds = useContext(OptionsContext)?.exposeIds;
    return <>
        <div
            onclick={[setSelectedComponent, componentData]}
            classList={{
                'cursor-default': true,
                'bg-slate-300': isSelected(),
                'hover:bg-slate-100': !isSelected()
            }}
            style={{'padding-left': `${indent}em`}}
        >
            {componentText(componentData, exposeIds)}
        </div>
        <For each={componentData.getChildren()}>{component => <ComponentUI {...component} />}</For>
    </>;
};

function componentText(componentData: ComponentData, exposeIds?: boolean): string {
    const id = exposeIds ? ` [${componentData.id}]` : '';
    return componentData.name + id;
}

const RootUI: Component<RootData> = rootData =>
    <For each={rootData.getChildren()}>{component => <ComponentUI {...component} />}</For>
;

const ComponentTree: Component<{roots: Accessor<RootData[]>}> = props =>
    <div class="h-full w-full flex flex-col">
        <div class="w-full flex-none flex flex-row py-1">
            <div class="py-0.5 mx-3 px-3 border border-blue-400">Placeholder</div>
        </div>
        <div class="flex-auto w-full overflow-auto text-xs leading-snug">
            <div class="min-w-fit">
                <For each={props.roots()}>{root => <RootUI {...root} />}</For>
            </div>
        </div>
    </div>
;

export {ComponentTree};
