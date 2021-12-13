
import type {Component} from 'solid-js';
import {onMount} from 'solid-js';

import type {DebugLog, LogRecord} from '../data/debug-log';

const DebugLogPanel: Component<{debugLog: DebugLog}> = props => {

    const renderer = new DebugLogRenderer();
    onMount(() => props.debugLog.attach(renderer.render));

    return <div style="flex: 1; display: flex; flex-flow: column">
        <div style="width: 100%; flex: none; display: flex">
            <button onclick={renderer.clear} style="margin: 0.8em; padding: 0.4em">Clear</button>
        </div>
        <div ref={renderer.div} style="width: 100%; flex: 1 1 100%; overflow: auto; font-family: sans-serif; font-size: small; line-height: 1.2"></div>
    </div>;
};

class DebugLogRenderer {
    div: HTMLDivElement | undefined;

    render = (logRecord: LogRecord) => {
        if (this.div) {
            const e = document.createElement('div');
            e.setAttribute('style', 'width: 100%; padding: 0.2em');
            if (logRecord.kind === 'transportMessage') {
                const t = document.createTextNode(JSON.stringify(logRecord.message));
                e.appendChild(t);
            } else {
                const t = document.createTextNode(`${logRecord.type}: ${logRecord.message}`);
                e.appendChild(t);
            }
            this.div.appendChild(e);
        }
    };

    clear = () => {
        this.div && (this.div.innerText = '');
    };
}

export {DebugLogPanel};
