
import {For, useContext, onCleanup, createMemo} from 'solid-js';

import type {ComponentDisposed, InspectComponentSelected} from '../../channel/channel-message-types';
import type {DomRootData, ComponentData} from '../data/component-data-types';
import type {SignalData} from '../data/signal-data-types';
import type {RegistryMirror} from '../registry-mirror/registry-mirror-types';
import {ComponentTreeSelectionContext, selectedComponent, selectedGlobalSignals} from './contexts/tree-selection-context';
import {OptionsContext} from './contexts/options-context';
import {ChannelContext} from './contexts/channel-context';
import {useChannelListener} from './contexts/use-channel-listener';
import {InspectElementsButton} from './inspect-elements-button';

const componentRowElements: Map<string, Element> = new Map();

function ComponentTree(props: {registryMirror: RegistryMirror}) {
    const {setTreeSelection} = useContext(ComponentTreeSelectionContext)!;
    const selectedComponentId = createMemo(() => selectedComponent()?.id);
    useChannelListener('componentDisposed', ({id}: ComponentDisposed) => {
        if (id === selectedComponentId()) {
            setTreeSelection(undefined);
        }
    });
    useChannelListener('inspectComponentSelected', ({componentId}: InspectComponentSelected) => {
        const componentData = props.registryMirror.getComponent(componentId)?.componentData;
        if (componentData) {
            const componentRowElement = componentRowElements.get(componentId);
            componentRowElement?.scrollIntoView({block: 'center'});
            setTreeSelection({selectionType: 'component', componentData});
        }
    });

    return <div class="h-full w-full flex flex-col">
        <div class="w-full flex-none flex flex-row py-1">
            <InspectElementsButton />
            <div class="flex-none mx-auto px-8 text-red-700 font-bold">work in progress</div>
        </div>
        <div class="flex-auto w-full overflow-auto text-xs leading-snug">
            <div class="min-w-fit">
                <GlobalSignals globalSignals={props.registryMirror.globalSignals} />
                <For each={props.registryMirror.domRootsData()}>{domRootData => <DomRootUI {...domRootData} />}</For>
            </div>
        </div>
    </div>
    ;
}

function DomRootUI(props: DomRootData) {
    return <For each={props.getChildren()}>{component => <ComponentUI {...component} />}</For>;
}

function ComponentUI(props: ComponentData) {
    const level = props.level() ?? 0;
    const indent = 1.5 * (level - 1);
    const {setTreeSelection} = useContext(ComponentTreeSelectionContext)!;
    const isSelected = createMemo(() => props.id === selectedComponent()?.id);
    const exposeIds = useContext(OptionsContext)?.exposeIds;
    const channel = useContext(ChannelContext)!;
    const onMouseEnter = (cd: ComponentData) => channel.send('highlightComponent', {componentId: cd.id});
    const onMouseLeave = () => channel.send('stopHighlightComponent', {});
    onCleanup(() => componentRowElements.delete(props.id));
    return <>
        <div
            ref={element => componentRowElements.set(props.id, element)}
            onclick={[setTreeSelection, {selectionType: 'component', componentData: props}]}
            onmouseenter={[onMouseEnter, props]}
            onmouseleave={onMouseLeave}
            classList={treeRowClassList(isSelected)}
            style={{'padding-left': `${indent}em`}}
        >
            {componentText(props, exposeIds)}
        </div>
        <For each={props.getChildren()}>{component => <ComponentUI {...component} />}</For>
    </>
    ;
}

function componentText(componentData: ComponentData, exposeIds?: boolean): string {
    const id = exposeIds ? ` [${componentData.id}]` : '';
    return componentData.name + id;
}

function GlobalSignals(props: {globalSignals: () => SignalData[]}) {
    const {setTreeSelection} = useContext(ComponentTreeSelectionContext)!;
    const isSelected = createMemo(() => !!selectedGlobalSignals());
    return <div onclick={[setTreeSelection, {selectionType: 'globalSignals', globalSignals: props.globalSignals}]} classList={treeRowClassList(isSelected)}>
        Global Signals
    </div>
    ;
}

function treeRowClassList(isSelected: () => boolean) {
    return {
        'cursor-default': true,
        'bg-slate-300': isSelected(),
        'hover:bg-slate-100': !isSelected(),
        'dark:hover:bg-slate-200': !isSelected()
    };
}

export {ComponentTree};
