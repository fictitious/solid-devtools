

import type {Component} from 'solid-js';
import {For, useContext} from 'solid-js';

import type {RootData, ComponentData} from '../data/component-data-types';
import {ChannelContext} from './channel-context';

const ComponentUI: Component<ComponentData> = componentData => {
    const level = componentData.level() ?? 0;
    const indent = 2 *(level - 1);
    const channel = useContext(ChannelContext);
    const componentClick = () => channel?.send('debugBreak', {componentId: componentData.id});
    return <>
        <div onclick={componentClick} style={{'padding-left': `${indent}em`}}>{`${componentData.name} id="${componentData.id}"`}</div>
        <For each={componentData.getChildren()}>{component =>
            <ComponentUI {...{...component}} />
        }</For>
    </>;
};

const RootUI: Component<RootData> = rootData => <For each={rootData.getChildren()}>{component =>
    <ComponentUI {...{...component}} />
}</For>;

export {RootUI, ComponentUI};
