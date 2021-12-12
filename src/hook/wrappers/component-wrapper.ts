
import type {Component} from 'solid-js';

import type {ComponentItem, SolidInstance} from './types';
import type {Registry} from './registry';

export type ComponentResult = ReturnType<Component> | (() => ComponentResult) | ComponentResult[];

function wrapComponent(comp: Component, solidInstance: SolidInstance, registry: Registry): (props: Record<string, unknown>) => ComponentResult {
    const wrapper = (props: Record<string, unknown>) => {

        const componentItem: ComponentItem = registry.registerComponent(comp, props);
        solidInstance.onCleanup(() => {
            registry.unregisterComponent(componentItem.id);
        });

        return wrapComponentResult(componentItem, comp(props), undefined, registry);
    };
    wrapper.componentName = comp.name;
    return wrapper;
}

function wrapComponentResult(componentItem: ComponentItem, result: ComponentResult, index: number[] | undefined, registry: Registry): ComponentResult {
    if (Array.isArray(result)) {
        const nextIndex = (i: number) => index === undefined ? [i] : [...index, i];
        return result.map((r, i) => wrapComponentResult(componentItem, r, nextIndex(i), registry));
    } else if (typeof result === 'function') {
        return () => wrapComponentResult(componentItem, result(), index, registry);
    } else {
        return registry.registerComponentResult(result, index === undefined ? [0] : index, componentItem);
    }
}

export {wrapComponent};
