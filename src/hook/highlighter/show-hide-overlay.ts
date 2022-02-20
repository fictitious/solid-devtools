
import {Overlay} from './overlay';

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
    componentName?: string;
    hideAfterTimeout?: boolean;
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

export {showOverlay, hideOverlay};
