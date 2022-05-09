
import type {JSX, Component, RegisterSolidInstance as SolidInstance} from 'solid-js';

import type {ComponentItem} from '../registry/node-component-types';
import type {Registry} from '../registry/registry-types';

function wrapComponent<T>(comp: Component<T>, solidInstance: SolidInstance, registry: Registry): (props: T) => JSX.Element {
    return new Proxy(
        (props: T) => {

            const componentItem = registry.registerComponent(comp as Component, props as Record<string, unknown>);
            solidInstance.onCleanup(() => {
                registry.unregisterComponent(componentItem.id);
            });

            return solidInstance.devComponent(
                comp,
                props,
                r => wrapComponentResult(componentItem, r, undefined, registry),
                componentItem.id
            );
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
}

function wrapComponentResult(componentItem: ComponentItem, result: JSX.Element, index: number[] | undefined, registry: Registry): JSX.Element {
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
