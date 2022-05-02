
import type {Component, Setter} from 'solid-js';

export interface NodeExtraData {
    id: string;
    resultOf?: string[];
    isRoot?: true;
}

export type ComponentProps = Record<string, unknown>;

export type ComponentItemResult = string | ComponentItemResult[] | undefined;
export interface ComponentItemBase {
    id: string;
    name: string;
    rawName: string;
    props?: {};
    result: ComponentItemResult[];
}
export interface ComponentItem extends ComponentItemBase {
    comp: Component;
}

export interface SignalItem {
    id: string;
    ownerId?: string;
    componentId?: string;
    setter: Setter<unknown>;
    name?: string;
    value: unknown;
    stack?: string;
}