
import type {Component} from 'solid-js';

export interface SolidInstance { // 'renderer' in react devtools
    buildType: 'development' | 'production';
}

export type ComponentWrapper = (c: Component) => Component;

export interface Hook {
    hookType: 'big' | 'small';
    solidInstances: Map<number, SolidInstance>;
    registerSolidInstance(solidInstance: SolidInstance): void;
    getComponentWrapper(updateWrapper: (newWrapper: ComponentWrapper) => void): ComponentWrapper;
}

// hook to inject into the page when solid devtools panel is not open
export interface HookSmall extends Hook {
    hookType: 'small';
}

// hook to inject into the page when solid devtools panel is open
export interface HookBig extends Hook {
    hookType: 'big';
}
