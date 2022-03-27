import type {Component, JSX} from 'solid-js';
import {Show, For, createSignal} from 'solid-js';

import type {SerializedValue, SerializedArray, SerializedObject} from '../../channel/channel-transport-types';
import type {SignalData} from '../data/component-data-types';
import svgExpanded from './assets/expanded.svg';
import svgCollapsed from './assets/collapsed.svg';


interface ValueListLineProps {
    level: number;
    name: string;
    valuePrefix?: string;
    valueString: string;
    expandButton?: () => JSX.Element;
}

const ValueListLine: Component<ValueListLineProps> = props => {
    const indent = 1.5 * props.level;
    return <div class="w-full flex cursor-default" style={{'padding-left': `${indent}em`}}>
        <div class="grow-0 shrink-0 basis-4 w-4">{props.expandButton && props.expandButton()}</div>
        <div class="grow-0 shrink-0 basis-auto text-ellipsis overflow-hidden">{props.name}</div>
        <div class="mr-2">:</div>
        <div class="flex-1 text-solid-light whitespace-pre text-ellipsis overflow-hidden pr-2">{props.valuePrefix && <span class="italic inline-block mr-2">{props.valuePrefix}</span>}{props.valueString}</div>
    </div>
    ;
};

function valueLineProps(level: number, name: string, value: SerializedValue): ValueListLineProps {
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
            return '[' + fixArray(value.v).map((v, i) => `${i}: ${inlineStringValue(v, 'short')}`).join(', ') + ']';
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

interface ValueListExpandableLineProps {
    level: number;
    name: string;
    value: SerializedValue;
}

const ValueListExpandableLine: Component<ValueListExpandableLineProps> = props => {
    let nested: () => JSX.Element = () => undefined;
    const value = props.value;
    const lineProps = valueLineProps(props.level, props.name, value);
    if (canExpand(value)) {
        const [expanded, setExpanded] = createSignal(false);
        const toggleExpanded = () => setExpanded(oldExpanded => !oldExpanded);
        lineProps.expandButton = () => <svg onclick={toggleExpanded} class="w-4 h-4"><use href={`${expanded() ? svgExpanded : svgCollapsed}#main`}></use></svg>;
        nested = () => <Show when={expanded()}><ValueList {...{level: props.level + 1, items: valueItems(value)}} /></Show>;
    }
    return <>
        <ValueListLine {...lineProps} />
        {nested()}
    </>;
};

type ItemsFunc = () => {name: string; value: SerializedValue}[];
interface ValueListProps {
    level: number;
    items: ItemsFunc;
}

const ValueList: Component<ValueListProps> = props =>
    <For each={props.items()}>
        {({name, value}) => <ValueListExpandableLine level={props.level} name={name} value={value} />}
    </For>
;

function fixArray(a: SerializedValue[]): SerializedValue[] {
    // JSON.stringify / JSON.parse do not preserve sparse arrays
    // that is, map will skip empty elements in the original array
    // but those elements will have null values after going through JSON.stringify / JSON.parse
    // and will no more be skipped by map
    // fix that
    const fixed: SerializedValue[] = [];
    a.forEach((e, i) => {
        if (e) {
            fixed[i] = e;
        }
    });
    return fixed;
}

function canExpand(value: SerializedValue): value is SerializedArray | SerializedObject {
    return value.t === 'array' && value.v.length > 0 || value.t === 'object' && Object.keys(value.v).length > 0;
}

function valueItems(value: SerializedArray | SerializedObject): ItemsFunc {
    switch (value.t) {
        case 'array':
            return () => fixArray(value.v).map((v, i) => ({name: i.toString(), value: v}));
        case 'object':
            return () => Object.entries(value.v).map(([n, v]) => ({name: n, value: v}));
    }
}

const PropsList: Component<{values: SerializedValue}> = ({values}) => {
    if (values.t === 'array' || values.t === 'object') {
        return <ValueList level={0} items={valueItems(values)} />;
    } else {
        return <ValueListLine {...valueLineProps(0, 'props', values)} />;
    }
};

const SignalList: Component<{signals: SignalData[]}> = props =>
    <For each={props.signals}>{signal =>  {
        const t = signal.value.t;
        const name = signal.name ?? signal.id;
        if (t === 'array' || t === 'object') {
            return <ValueListExpandableLine level={0} name={name} value={signal.value} />;
        } else {
            return <ValueListLine {...valueLineProps(0, name, signal.value)} />;
        }
    }}</For>
;

export {PropsList, SignalList};
