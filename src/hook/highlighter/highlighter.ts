
import type {Registry} from '../registry/registry-types';
import {getComponentResultIds} from '../registry/component-functions';
import {Overlay} from './overlay';

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

let timeoutId: number | undefined;
let overlay: Overlay | undefined;

function hideOverlay() {
    if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
    }

    if (overlay) {
        overlay.remove();
        overlay = undefined;
    }
}

const SHOW_DURATION = 2000;

interface ShowOverlay {
    elements: HTMLElement[];
    componentName: string;
    hideAfterTimeout: boolean;
}
function showOverlay({elements, componentName, hideAfterTimeout}: ShowOverlay): void {
    if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
    }
    if (overlay === undefined) {
        overlay = new Overlay();
    }

    overlay.inspect(elements, componentName);

    if (hideAfterTimeout) {
        timeoutId = setTimeout(hideOverlay, SHOW_DURATION);
    }
}

export {highlightComponent, stopHighlightComponent};
