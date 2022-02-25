
// based on Highlighter/index.js from React Devtools

import throttle from 'lodash.throttle';
import memoizeOne from 'memoize-one';

import type {solidDevtoolsKey as SolidDevtoolsKey} from '../registry/registry-types';
import type {Channel} from '../../channel/channel-types';
import type {NodeExtra} from '../registry/registry-types';
import {showOverlay, hideOverlay} from './show-hide-overlay';

interface InspectingSelector {
    stopInspecting(): void;
}

let selector: InspectingSelector | undefined;

function startInspecting(channel: Channel<'page'>, solidDevtoolsKey: typeof SolidDevtoolsKey) {
    selector = new InspectingSelectorImpl(channel, solidDevtoolsKey);
}

function stopInspecting() {
    selector?.stopInspecting();
    selector = undefined;
}

class InspectingSelectorImpl {

    iframesListeningTo: Set<HTMLIFrameElement>;

    constructor(
        public channel: Channel<'page'>,
        public solidDevtoolsKey: typeof SolidDevtoolsKey
    ) {
        this.iframesListeningTo = new Set();
        this.channel.addShutdownListener(this.stopInspecting);
        this.addListeners(window);
    }

    addListeners(w: Window) {
        w.addEventListener('click', this.onClick, true);
        w.addEventListener('mousedown', this.onMouseEvent, true);
        w.addEventListener('mouseup', this.onMouseEvent, true);
        w.addEventListener('mouseover', this.onMouseEvent, true);
        w.addEventListener('pointerdown', this.onPointerDown, true);
        w.addEventListener('pointerup', this.onPointerUp, true);
        w.addEventListener('pointerover', this.onPointerOver, true);
    }

    removeListeners(w: Window | null) {
        if (w) {
            w.removeEventListener('click', this.onClick, true);
            w.removeEventListener('mousedown', this.onMouseEvent, true);
            w.removeEventListener('mouseup', this.onMouseEvent, true);
            w.removeEventListener('mouseover', this.onMouseEvent, true);
            w.removeEventListener('pointerdown', this.onPointerDown, true);
            w.removeEventListener('pointerup', this.onPointerUp, true);
            w.removeEventListener('pointerover', this.onPointerOver, true);
        }
    }

    stopInspecting = () => {
        hideOverlay();
        this.channel.removeShutdownListener(this.stopInspecting);
        this.removeListeners(window);
        this.iframesListeningTo.forEach(frame => {
            try {
                this.removeListeners(frame.contentWindow);
            } catch (error) {
                // This can error when the iframe is on a cross-origin.
            }
        });
        this.iframesListeningTo = new Set();
    };

    onClick = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        stopInspecting();

        this.channel.send('inspectComponentEnded', {});
    };

    onMouseEvent = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
    };

    onPointerDown = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this.selectComponentForElement(event.target as HTMLElement);
    };

    onPointerUp = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
    };

    onPointerOver = (event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();

        const target = event.target as HTMLElement;

        if (target.tagName === 'IFRAME') {
            const iframe: HTMLIFrameElement = target as HTMLIFrameElement;
            try {
                if (!this.iframesListeningTo.has(iframe)) {
                    const window = iframe.contentWindow;
                    if (window) {
                        this.addListeners(window);
                        this.iframesListeningTo.add(iframe);
                    }
                }
            } catch (error) {
                // This can error when the iframe is on a cross-origin.
            }
        }

        showOverlay({elements: [target]});

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this.selectComponentForElement(target);
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    selectComponentForElement =
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        throttle(
            memoizeOne((node: HTMLElement): void => {
                let componentId: string | undefined;
                let n: (Node & NodeExtra) | null = node;
                while (n && componentId === undefined) {
                    const resultOf = n[this.solidDevtoolsKey]?.resultOf;
                    if (resultOf) {
                        componentId = resultOf[0];//resultOf[resultOf.length - 1];
                    }
                    n = n.parentNode;
                }
                if (componentId) {
                    this.channel.send('inspectComponentSelected', {componentId});
                }
            }),
            200,
            // Don't change the selection in the very first 200ms
            // because those are usually unintentional as you lift the cursor.
            {leading: false}
        );
}

export {startInspecting, stopInspecting};
