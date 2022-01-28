import type {Component} from 'solid-js';
import {createSignal, createEffect, Show, Switch, Match, For} from 'solid-js';


import type {ConnectionState} from '../connection/connection-state-types';
import type {RootsData} from '../data/component-data-types';
import type {RegistryMirror} from '../registry-mirror/registry-mirror-types';
import {RootUI} from './component';
import {ChannelContext} from './channel-context';
import {buttonClass} from './common-styles';

interface ComponentsPanelProps {
    connectionState: ConnectionState;
    rootsData: RootsData;
    registryMirror: RegistryMirror;
}

const TimeoutMessage: Component = () => {
    const [visible, setVisible] = createSignal(false);
    const timeoutSeconds = 8;
    createEffect(() => setTimeout(() => setVisible(true), timeoutSeconds * 1000));
    return <Show when={visible()}><p>Seems like something went wrong. Try to close the browser window and open again.</p></Show>;
};

const connectionStateClass = 'pt-3 pl-3 text-sm leading-normal';

const ConnectionStateSwitch: Component<{connectionState: ConnectionState}> = props => {
    const reload = () => chrome.devtools.inspectedWindow.reload({});
    return <Switch>
        <Match when={props.connectionState.hookType() === 'stub'}>
            <div class={connectionStateClass}>
                <p>The page was loaded while Solid devtools were not active.</p>
                <p>Solid does not create data structures necessary for visualizing the component tree while the devtools window is not shown.</p>
                <p>Click <button onclick={reload} class={buttonClass}>Reload</button> to reload the page</p>
            </div>
        </Match>
        <Match when={props.connectionState.channelState() === 'disconnected'}>
            <div class={connectionStateClass}>
                <p>Solid devtools has disconnected from the page.</p>
                <p>Please close devtools and open again to reconnect.</p>
            </div>
        </Match>
        <Match when={props.connectionState.channelState() === 'connected-incapable'}>
            <div class={connectionStateClass}>
                <p>The page was updated while Solid devtools were not active.</p>
                <p>Solid does not maintain data structures necessary for visualizing the component tree while the devtools window is not shown.</p>
                <p>Click <button onclick={reload} class={buttonClass}>Reload</button> to reload the page.</p>
            </div>
        </Match>
        <Match when={props.connectionState.channelState() === 'connecting'}>
            <div class={connectionStateClass}>
                <p>connecting...</p>
                <TimeoutMessage />
            </div>
        </Match>
        <Match when={props.connectionState.channelState() === 'connected'}>
            <ChannelContext.Provider value={props.connectionState.channel()}>
                {props.children}
            </ChannelContext.Provider>
        </Match>
    </Switch>;
};

const ComponentsPanel: Component<ComponentsPanelProps> = props => {
    return <div class="h-full flex flex-col text-sm">
        <ConnectionStateSwitch connectionState={props.connectionState}>
            <div class="w-full flex-none flex py-1">
                <div class="py-0.5 mx-3 px-3 border border-blue-400">Placeholder</div>
            </div>
            <div class="flex-auto w-full overflow-auto text-xs leading-snug">
                <For each={props.rootsData.roots()}>{root =>
                    <RootUI {...{...root}} />
                }</For>
            </div>
        </ConnectionStateSwitch>
    </div>;
};

export {ComponentsPanel};
