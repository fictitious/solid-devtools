

import type {Component} from 'solid-js';
import {For} from 'solid-js';

import type {RootData, ComponentData} from '../data/component-data-types';

const ComponentUI: Component<ComponentData> = componentData => {
    const level = componentData.level() ?? 0;
    const indent = 2 *(level - 1);
    return <>
        <div style={{'padding-left': `${indent}em`}}>{`<${componentData.name}>`}</div>
        <For each={componentData.getChildren()}>{component =>
            <ComponentUI {...{...component}} />
        }</For>
    </>;
};

const RootUI: Component<RootData> = rootData => <For each={rootData.getChildren()}>{component =>
    <ComponentUI {...{...component}} />
}</For>;

export {RootUI, ComponentUI};
