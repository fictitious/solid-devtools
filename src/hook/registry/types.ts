
import type {Component, Accessor, Setter} from 'solid-js';

export interface SolidInstance { // 'renderer' in react devtools
    createSignal: <T>(value: T, options?: { equals?: false | ((prev: T, next: T) => boolean); name?: string; internal?: boolean }) => [get: Accessor<T>, set: Setter<T>];
    createMemo: <T>(fn: (v?: T) => T, value?: undefined, options?: { equals?: false | ((prev: T, next: T) => boolean); name?: string }) => () => T;
    untrack: <T>(fn: () => T) => T;
    onCleanup: (fn: () => void) => void;
    buildType: 'development' | 'production';
}


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
