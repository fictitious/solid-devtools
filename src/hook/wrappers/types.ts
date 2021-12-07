
import type {Component} from 'solid-js';

export interface SolidInstance { // 'renderer' in react devtools
    createMemo: <T>(fn: (v?: T) => T, value?: undefined, options?: { equals?: false | ((prev: T, next: T) => boolean); name?: string }) => () => T;
    onCleanup: (fn: () => void) => void;
    buildType: 'development' | 'production';
}

export type ComponentProps = Record<string, unknown>;

export interface ComponentItem {
    id: string;
    comp: Component;
    name: string;
    props?: {};
}
