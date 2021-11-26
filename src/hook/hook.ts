// script to inject into the page when solid devtools panel is open

import type {Component} from 'solid-js';

import type {Hook, ComponentWrapper} from './hook-types';
import {HookBaseImpl, installHook} from './hook-base';

interface ComponentItem {
    comp: Component;
    props?: {};
    parent?: ComponentItem;
}

export type SingleComponentResult = ReturnType<Component> | ((props?: Record<string, unknown>) => ComponentResult);
export type ComponentResult = SingleComponentResult | SingleComponentResult[];

class HookImpl extends HookBaseImpl implements Hook {

    hookType = 'full' as const;
    componentStack: ComponentItem[] = [];

    getComponentWrapper(_updateWrapper: (newWrapper: ComponentWrapper) => void): ComponentWrapper {
        return comp => this.wrapComponent(comp);
    }

    wrapComponent(comp: Component): (props?: Record<string, unknown>) => ComponentResult {
        const wrapper = (props?: Record<string, unknown>) => {
            let result: ReturnType<Component> | undefined;
            try {
                const componentItem = {comp, props, parent: this.componentStack[this.componentStack.length - 1]};
                this.componentStack.push(componentItem);
                result = comp(props!);
            } finally {
                result = this.wrapComponentResult(result);
                this.componentStack.pop();
            }
            return result!;
        };
        wrapper.componentName = comp.name;
        return wrapper;
    }

    wrapComponentResult(result: ComponentResult): ComponentResult {
        if (Array.isArray(result)) {
            return result.map(r => this.wrapComponentResult(r));
        } else if (typeof result === 'function') {
            return this.wrapComponent(result);
        } else {
            return result;
        }
    }
}

installHook(window, new HookImpl());
