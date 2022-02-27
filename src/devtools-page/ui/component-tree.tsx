
import type {Accessor, Component} from 'solid-js';
import {For, useContext, onCleanup} from 'solid-js';

import type {ComponentDisposed, InspectComponentSelected} from '../../channel/channel-message-types';
import type {RootData, ComponentData} from '../data/component-data-types';
import type {RegistryMirror} from '../registry-mirror/registry-mirror-types';
import {SelectedComponentContext} from './contexts/selected-component-context';
import {OptionsContext} from './contexts/options-context';
import {ChannelContext} from './contexts/channel-context';
import {InspectElementsButton} from './inspect-elements-button';
import {useChannelListener} from './use-channel-listener';

const componentRowElements: Map<string, Element> = new Map();

const ComponentUI: Component<ComponentData> = componentData => {
    const level = componentData.level() ?? 0;
    const indent = 1.5 * (level - 1);
    const {selectedComponent, setSelectedComponent} = useContext(SelectedComponentContext)!;
    const isSelected = () => componentData.id === selectedComponent()?.id;
    const exposeIds = useContext(OptionsContext)?.exposeIds;
    const channel = useContext(ChannelContext)!;
    const onMouseEnter = (cd: ComponentData) => channel.send('highlightComponent', {componentId: cd.id});
    const onMouseLeave = () => channel.send('stopHighlightComponent', {});
    onCleanup(() => componentRowElements.delete(componentData.id));
    return <>
        <div
            ref={element => componentRowElements.set(componentData.id, element)}
            onclick={[setSelectedComponent, componentData]}
            onmouseenter={[onMouseEnter, componentData]}
            onmouseleave={onMouseLeave}
            classList={{
                'cursor-default': true,
                'bg-slate-300': isSelected(),
                'hover:bg-slate-100': !isSelected(),
                'dark:hover:bg-slate-200': !isSelected()
            }}
            style={{'padding-left': `${indent}em`}}
        >
            {componentText(componentData, exposeIds)}
        </div>
        <For each={componentData.getChildren()}>{component => <ComponentUI {...component} />}</For>
    </>
    ;
};

function componentText(componentData: ComponentData, exposeIds?: boolean): string {
    const id = exposeIds ? ` [${componentData.id}]` : '';
    return componentData.name + id;
}

const RootUI: Component<RootData> = rootData =>
    <For each={rootData.getChildren()}>{component => <ComponentUI {...component} />}</For>
;

const ComponentTree: Component<{roots: Accessor<RootData[]>; registryMirror: RegistryMirror}> = props => {
    const {selectedComponent, setSelectedComponent} = useContext(SelectedComponentContext)!;
    useChannelListener('componentDisposed', ({id}: ComponentDisposed) => {
        if (id === selectedComponent()?.id) {
            setSelectedComponent(undefined);
        }
    });
    useChannelListener('inspectComponentSelected', ({componentId}: InspectComponentSelected) => {
        const componentData = props.registryMirror.getComponent(componentId)?.componentData;
        if (componentData) {
            const componentRowElement = componentRowElements.get(componentId);
            componentRowElement?.scrollIntoView({block: 'center'});
            setSelectedComponent(componentData);
        }
    });

    return <div class="h-full w-full flex flex-col">
        <div class="w-full flex-none flex flex-row py-1">
            <InspectElementsButton />
            <div class="flex-none mx-auto px-8 text-red-700 font-bold">work in progress</div>
        </div>
        <div class="flex-auto w-full overflow-auto text-xs leading-snug">
            <div class="min-w-fit">
                <For each={props.roots()}>{root => <RootUI {...root} />}</For>
            </div>
        </div>
    </div>
    ;
};

export {ComponentTree};
