
import type {Component} from 'solid-js';
import {onMount} from 'solid-js';

import type {Channel} from '../../channel/channel-types';
import type {RegistryMirror} from '../registry-mirror/registry-mirror-types';
import type {DebugLog, LogRecord} from '../data/logger-types';
import {buttonClass} from './common-styles';

const toolbarButtonClass = `${buttonClass} mx-3`;

const DebugLogPanel: Component<{debugLog: DebugLog; registryMirror: RegistryMirror; channel: () => Channel<'devtools'> | undefined}> = props => {

    const logRegistry = () => {
        console.log(`registryMirror`, props.registryMirror);
        props.channel()!.send('test-message', {});
    };
    const renderer = new DebugLogRenderer();
    onMount(() => props.debugLog.attach(renderer.render));

    return <div class="flex flex-col h-full">
        <div class="flex-none w-full flex py-1">
            <button onclick={renderer.clear} class={toolbarButtonClass}>Clear</button>
            <button onclick={logRegistry} class={toolbarButtonClass}>Log Registry</button>
        </div>
        <div ref={renderer.div} class="flex-auto w-full overflow-auto text-xs leading-tight"></div>
    </div>;
};

class DebugLogRenderer {
    div: HTMLDivElement | undefined;

    render = (logRecord: LogRecord) => {
        if (this.div) {
            const e = document.createElement('div');
            let cls = 'w-full p-1';
            if (logRecord.kind === 'transportMessage') {
                const t = document.createTextNode(JSON.stringify(logRecord.message));
                e.appendChild(t);
            } else {
                const t = document.createTextNode(`${logRecord.type}: ${logRecord.message}`);
                e.appendChild(t);
                if (logRecord.type === 'error') {
                    cls += ' text-pink-700';
                } else if (logRecord.type === 'warn') {
                    cls += ' text-yellow-500';
                }
            }
            e.setAttribute('class', cls);
            this.div.appendChild(e);
        }
    };

    clear = () => {
        this.div && (this.div.innerText = '');
    };
}

export {DebugLogPanel};
