
import type {Component, Accessor, Setter} from 'solid-js';

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
    props?: {};
    result: ComponentItemResult[];
}
export interface ComponentItem extends ComponentItemBase {
    comp: Component;
    debugBreak: Accessor<boolean>;
    setDebugBreak: Setter<boolean>;
}
