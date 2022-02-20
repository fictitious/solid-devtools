
import type {Registry} from '../registry/registry-types';
import {getComponentResultIds} from '../registry/component-functions';
import {showOverlay, hideOverlay} from './show-hide-overlay';

function highlightComponent(componentId: string, registry: Registry): void {
    const component = registry.getComponent(componentId);
    const nodes: HTMLElement[] = [];
    let componentName = '';
    if (component) {
        componentName = component.name;
        const resultIds = getComponentResultIds(component);
        for (const nodeId of resultIds) {
            const node = registry.getDomNode(nodeId);
            if (node instanceof HTMLElement) {
                nodes.push(node);
            }
        }
    }
    if (nodes.length > 0) {
        showOverlay({elements: nodes, componentName, hideAfterTimeout: true});
    } else {
        hideOverlay();
    }
}

function stopHighlightComponent() {
    hideOverlay();
}

export {highlightComponent, stopHighlightComponent};
