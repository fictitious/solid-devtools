
import type {Component} from 'solid-js';

export interface SolidInstance { // 'renderer' in react devtools
    buildType: 'development' | 'production';
}

export type ComponentWrapper = (c: Component) => Component;

export interface HookBase {
    hookType: 'full' | 'stub';
    solidInstances: Map<number, SolidInstance>;
    registerSolidInstance(solidInstance: SolidInstance): void;
    initChannel(): void;
    getComponentWrapper(updateWrapper: (newWrapper: ComponentWrapper) => void): ComponentWrapper;
}

// hook to inject into the page when solid devtools panel is not open
export interface HookStub extends HookBase {
    hookType: 'stub';
}

// hook to inject into the page when solid devtools panel is open
export interface Hook extends HookBase {
    hookType: 'full';
}

export type HookType = HookBase['hookType'];

