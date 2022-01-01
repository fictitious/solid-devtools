import type {Component} from 'solid-js';
import {Switch, Match, For} from 'solid-js';


import type {ConnectionState} from '../connection/connection-state-types';
import type {RootsData} from '../data/component-data-types';
import type {RegistryMirror} from '../registry-mirror/registry-mirror-types';
import {RootUI} from './component';
import {ChannelContext} from './channel-context';

interface ComponentsPanelProps {
    connectionState: ConnectionState;
    rootsData: RootsData;
    registryMirror: RegistryMirror;
}

const ConnectionStateSwitch: Component<{connectionState: ConnectionState}> = props => {
    const reload = () => chrome.devtools.inspectedWindow.reload({});
    return <Switch>
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
            <ChannelContext.Provider value={props.connectionState.channel()}>
                {props.children}
            </ChannelContext.Provider>
        </Match>
    </Switch>;
};

const ComponentsPanel: Component<ComponentsPanelProps> = props => {

    const testButtonClick = () => {
        console.log(`registryMirror`, props.registryMirror);
        props.connectionState.channel()?.send('test-message', {});
    };

    return <div style="flex: 1; display: flex; flex-flow: column; font-family: sans-serif; font-size: small; line-height: 1.2">
        <ConnectionStateSwitch connectionState={props.connectionState}>
            <div style="width: 100%; flex: none; display: flex">
                <button onclick={testButtonClick} style="margin: 0.8em; padding: 0.4em">Send Test Message</button>
            </div>
            <div style="width: 100%; flex: 1 1 100%; overflow: auto; ">
                <For each={props.rootsData.roots()}>{root =>
                    <RootUI {...{...root}} />
                }</For>
            </div>
        </ConnectionStateSwitch>
    </div>;
};

export {ComponentsPanel};
