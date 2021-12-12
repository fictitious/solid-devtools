import type {Component} from 'solid-js';
import {Switch, Match, createEffect, createMemo, onCleanup} from 'solid-js';

import type {ConnectionState} from '../connection-state';
import {createRegistryMirror} from '../data/registry-mirror';

export interface ComponentsPanelProps {
    connectionState: ConnectionState;
}

const messages = [
    'componentRendered',
    'componentDisposed',
    'domNodeRegistered',
    'domNodeRemoved',
    'domNodeAddedResultOf',
    'domNodeIsRoot',
    'domNodeRootDisposed',
    'domNodeAppended',
    'domNodeInserted'
] as const;

const ComponentsPanel: Component<ComponentsPanelProps> = props => {

    const registryMirror = createMemo(() => createRegistryMirror());
    createEffect(() => props.connectionState.channel() && registryMirror().subscribe(props.connectionState.channel()!));
    onCleanup(() => props.connectionState.channel() && registryMirror().unsubscribe(props.connectionState.channel()!));

    const reload = () => chrome.devtools.inspectedWindow.reload({});
    const testButtonClick = () => {
        console.log(`registryMirror`, registryMirror());
        props.connectionState.channel()?.send('test-message', {});
    };
    let div: HTMLDivElement | undefined;
    const listener = (m: {}) => {
        if (div) {
            const e = document.createElement('div');
            const t = document.createTextNode(JSON.stringify(m));
            e.appendChild(t);
            div.appendChild(e);
        }
    };
    createEffect(() => {
        for (const n of messages) {
            props.connectionState.channel()?.addListener(n, listener);
        }
    });
    onCleanup(() => {
        for (const n of messages) {
            props.connectionState.channel()?.removeListener(n, listener);
        }
    });

    return <div>
        <p>hook type: {props.connectionState.hookType()}</p>
        <p>channel state: {props.connectionState.channelState()}</p>
        <Switch>
            <Match when={props.connectionState.hookType() === 'stub'}>
                <p>The page was loaded while Solid devtools were not active</p>
                <p>Solid does not create data structures necessary for visualizing the component tree while the devtools window is not shown.</p>
                <p>Click <button onclick={reload}>Reload</button> to reload the page</p>
            </Match>
            <Match when={props.connectionState.channelState() === 'disconnected'}>
                <p>Solid devtools has disconnected from the page</p>
            </Match>
            <Match when={props.connectionState.channelState() === 'connected-incapable'}>
                <p>The page was updated while Solid devtools were not active</p>
                <p>Solid does not maintain data structures necessary for visualizing the component tree while the devtools window is not shown.</p>
                <p>Click <button onclick={reload}>Reload</button> to reload the page</p>
            </Match>
            <Match when={props.connectionState.channelState() === 'connecting'}>
                <p>connecting...</p>
            </Match>
            <Match when={props.connectionState.channelState() === 'connected'}>
                <button onclick={testButtonClick}>Send Test Message</button>
                <div ref={div}></div>
            </Match>
        </Switch>
    </div>;
};

export {ComponentsPanel};
