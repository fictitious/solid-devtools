
import type {Component, RegisterSolidInstance as SolidInstance} from 'solid-js';

import type {ComponentItem} from '../registry/node-component-types';
import type {Registry} from '../registry/registry-types';

type ComponentResult = ReturnType<Component> | (() => ComponentResult) | ComponentResult[];

function wrapComponent<T>(comp: Component<T>, solidInstance: SolidInstance, registry: Registry): (props: T) => ComponentResult {
    // when devtools is open, this function is also serving as a replacement for devComponent
    if (solidInstance.buildType === 'development') {
        Object.assign(comp, {[solidInstance.$DEVCOMP]: true});
    }

    const wrapper = new Proxy(
        (props: T) => {

            const componentItem = registry.registerComponent(solidInstance, comp as Component, props as Record<string, unknown>);
            solidInstance.onCleanup(() => {
                registry.unregisterComponent(componentItem.id);
            });

            // returning function here instead of returning directly the component result
            // effectively wraps each component inside JSX expression, making it like {<comp />} instead of just <comp />
            // this makes the insert() in dom-expressions to wrap this function into createEffect,
            // so that the component will be re-rendered and its result properly reinserted
            // each time when watchingSignals() or debugBreak() signals change
            return () => {
                const {c, runComponent} = solidInstance.devComponentComputation(comp.name);
                if (componentItem.watchingSignals() || c.devtoolsData) {
                    const u = {id: componentItem.id, type: 'devComponent'} as const;
                    c.devtoolsData ? Object.assign(c.devtoolsData, u) : c.devtoolsData = u;
                }
                const debugBreak = componentItem.debugBreak && componentItem.debugBreak();

                return runComponent(() => {
                    let componentResult: ComponentResult | undefined;
                    if (debugBreak) {
                        componentResult = solidInstance.untrack(() => {
                            debugger;
                            return comp(props);
                        });
                    } else {
                        componentResult = solidInstance.untrack(() => comp(props));
                    }
                    return wrapComponentResult(componentItem, componentResult, undefined, registry);
                });
            };
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
