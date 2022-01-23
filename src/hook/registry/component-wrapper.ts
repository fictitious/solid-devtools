
import type {Component} from 'solid-js';
import type {RegisterSolidInstance as SolidInstance} from 'solid-js/devtools-api';

import type {ComponentItem} from './node-component-types';
import type {Registry} from './registry-types';

type ComponentResult = ReturnType<Component> | (() => ComponentResult) | ComponentResult[];

function wrapComponent(comp: Component, solidInstance: SolidInstance, registry: Registry): (props: Record<string, unknown>) => ComponentResult {
    const wrapper = new Proxy(
        (props: Record<string, unknown>) => {

            const componentItem: ComponentItem = registry.registerComponent(solidInstance, comp, props);
            solidInstance.onCleanup(() => {
                registry.unregisterComponent(componentItem.id);
            });

            const compMemo = solidInstance.createMemo(() => {
                const debugBreak = componentItem.debugBreak();
                return solidInstance.untrack(() => {
                    if (debugBreak) debugger;
                    return comp(props);
                });
            });

            return wrapComponentResult(componentItem, compMemo(), undefined, registry);
        }, {
            get(_, property: keyof Component) {
                return comp[property];
            },
            set(_, property: keyof Component, value: Component[keyof Component]) {
                comp[property] = value;
                return true;
            }
        }
    );
    return wrapper;
}

function wrapComponentResult(componentItem: ComponentItem, result: ComponentResult, index: number[] | undefined, registry: Registry): ComponentResult {
    if (Array.isArray(result)) {
        const nextIndex = (i: number) => index === undefined ? [i] : [...index, i];
        return result.map((r, i) => wrapComponentResult(componentItem, r, nextIndex(i), registry));
    } else if (typeof result === 'function') {
        return () => wrapComponentResult(componentItem, result(), index, registry);
    } else {
        if ((result instanceof Node) && ('remove' in result)) {
            wrapNodeMethods(result, registry);
        }
        return registry.registerComponentResult(result, index === undefined ? [0] : index, componentItem);
    }
}

function wrapNodeMethods(node: ChildNode, registry: Registry) {
    const originalRemove = node.remove.bind(node);
    node.remove = () => {
        registry.nodeRemoved(node);
        originalRemove();
    };
}

export {wrapComponent};
