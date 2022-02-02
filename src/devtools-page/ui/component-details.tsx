
import type {Component, JSX} from 'solid-js';
import {Show, For, createSignal, useContext} from 'solid-js';

import type {SerializedValue, SerializedArray, SerializedObject} from '../../channel/channel-transport-types';
import {ChannelContext} from './channel-context';
import {SelectedComponentContext} from './selected-component-context';
import {buttonClass} from './common-styles';

const toolbarButtonClass = `${buttonClass} mx-3 flex-none`;

interface ComponentPropLineProps {
    level: number;
    name: string;
    valuePrefix?: string;
    valueString: string;
    expandButton?: () => JSX.Element;
}

const ComponentPropLine: Component<ComponentPropLineProps> = props => {
    const indent = 2 * props.level;
    return <div class="w-full flex" style={{'padding-left': `${indent}em`}}>
        <div class="grow-0 shrink-0 basis-4 w-4">{props.expandButton && props.expandButton()}</div>
        <div class="grow-0 shrink-0 basis-auto text-ellipsis overflow-hidden">{props.name}</div>
        <div class="mr-2">:</div>
        <div class="flex-1 text-solid-light whitespace-pre text-ellipsis overflow-hidden pr-2">{props.valuePrefix && <span class="italic inline-block mr-2">{props.valuePrefix}</span>}{props.valueString}</div>
    </div>
    ;
};

function propLine(level: number, name: string, value: SerializedValue): ComponentPropLineProps {
    const valuePrefix = value.t === 'function' ? 'f' : value.t === 'circular' ? 'circular' : value.t === 'getter' ? '(getter)' : undefined;
    return {
        level,
        name,
        valuePrefix,
        valueString: inlineStringValue(value, 'long')
    };
}

function inlineStringValue(value: SerializedValue, style: 'short' | 'long'): string {
    switch (value.t) {
        case 'array':
            return '[' + value.v.map((v, i) => `${i}: ${inlineStringValue(v, 'short')}`).join(', ') + ']';
        case 'object':
            return '{' + Object.entries(value.v).map(([n, v]) => `${n}: ${inlineStringValue(v, 'short')}`).join(', ') + '}';
        case 'circular':
            return '';
        case 'function':
            return `${value.name ?? ''}() {}`;
        case 'getter':
            return style === 'short' ? '(getter)' : '';
        case 'date':
            return new Date(value.v).toString();
        case 'primitive':
            return JSON.stringify(value.v);
    }
}

type ItemsFunc = () => {name: string; value: SerializedValue}[];
interface ComponentPropListProps {
    level: number;
    items: ItemsFunc;
}

const ComponentPropList: Component<ComponentPropListProps> = props =>
    <For each={props.items()}>{({name, value}) => {
        let nested: () => JSX.Element = () => undefined;
        const propLineProps = propLine(props.level, name, value);
        if (canExpand(value)) {
            const [expanded, setExpanded] = createSignal(false);
            const toggleExpanded = () => setExpanded(oldExpanded => !oldExpanded);
            propLineProps.expandButton = () => <span onclick={toggleExpanded}>{expanded() ? 'v' : '>'}</span>;
            nested = () => <Show when={expanded()}><ComponentPropList {...{level: props.level + 1, items: valueItems(value)}} /></Show>;
        }
        return <>
            <ComponentPropLine {...propLineProps} />
            {nested()}
        </>
        ;
    }}</For>
;


function canExpand(value: SerializedValue): value is SerializedArray | SerializedObject {
    return value.t === 'array' && value.v.length > 0 || value.t === 'object' && Object.keys(value.v).length > 0;
}

function valueItems(value: SerializedArray | SerializedObject): ItemsFunc {
    switch (value.t) {
        case 'array':
            return () => value.v.map((v, i) => ({name: i.toString(), value: v}));
        case 'object':
            return () => Object.entries(value.v).map(([n, v]) => ({name: n, value: v}));
    }
}

const ComponentProps: Component<{props: SerializedValue}> = ({props}) => {
    if (props.t === 'array' || props.t === 'object') {
        return <ComponentPropList level={0} items={valueItems(props)} />;
    } else {
        return <ComponentPropLine {...propLine(0, 'props', props)} />;
    }
};

const ComponentDetails: Component = () => {

    const channel = useContext(ChannelContext);
    const {selectedComponent} = useContext(SelectedComponentContext)!;
    const debugClick = (componentId: string) => channel?.send('debugBreak', {componentId});

    return <div class="h-full w-full flex flex-col">
        <div class="w-full flex-none flex flex-row py-1 text-xs">
            <Show when={selectedComponent()}>{component => <>
                <div class="py-0.5 mx-3 px-3 w-16 flex-auto text-solid-light text-ellipsis overflow-hidden">{component.name}</div>
                <button onclick={[debugClick, component.id]} class={toolbarButtonClass}>debugger</button>
            </>}</Show>
        </div>
        <div class="flex-auto w-full overflow-auto text-xs leading-snug">
            <Show when={selectedComponent()}>{component => <ComponentProps props={component.props} />}</Show>
        </div>
    </div>
    ;
};

export {ComponentDetails};
