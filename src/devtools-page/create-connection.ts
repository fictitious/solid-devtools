// based on main.js from React Devtools

import {globalHookName} from '../hook/hook-name';
import type {ChannelMessageFromPage, HelloAnswer} from '../channel/channel-message-types';
import {createChannel} from '../channel/channel';
import type {Message, Transport} from '../channel/channel';
import {encodePortName} from '../channel/port-name';
import type {Options} from '../options/options';
import {loadOptions} from '../options/options';
import type {RegistryMirror} from './data/registry-mirror-types';
import {createRegistryMirror} from './data/registry-mirror';
import {createRoots} from './data/component-data';
import type {DebugLog} from './data/debug-log';
import {createDebugLog} from './data/debug-log';
import type {ConnectionState, ChannelState} from './connection-state';
import {createConnectionState} from './connection-state';
import {createPanels} from './create-panels';

let connectionState: ConnectionState | undefined;

function createConnectionAndPanelIfSolidRegistered(cleanupOnSolidFirstDetected: () => void) {
    if (!connectionState) {
        chrome.devtools.inspectedWindow.eval(
            `({solidRegistered: !!window.${globalHookName}?.solidInstance, hookType: window.${globalHookName}?.hookType})`,
            function({solidRegistered = false, hookType = ''}: {solidRegistered?: boolean; hookType?: string} = {}) {
                if (solidRegistered && !connectionState) {
                    cleanupOnSolidFirstDetected();

                    void loadOptions()
                    .then(options => {
                        connectionState = createConnectionState(hookType === 'full' ? 'full' : 'stub');
                        const rootsData = createRoots();
                        const debugLog = createDebugLog(options);
                        const registryMirror = createRegistryMirror(rootsData, debugLog.logger());
                        createConnection({
                            devtoolsInstanceId: connectionState.devtoolsInstanceId,
                            previousHookInstanceId: connectionState.previousHookInstanceId,
                            tabId: chrome.devtools.inspectedWindow.tabId,
                            registryMirror,
                            debugLog,
                            options
                        });
                        createPanels(connectionState, rootsData, registryMirror, options, debugLog);
                    });
                }
            }
        );
    }
}

export interface InitConnector {
    devtoolsInstanceId: string;
    previousHookInstanceId?: string;
    tabId: number;
    registryMirror: RegistryMirror;
    debugLog: DebugLog;
    options: Options;
}

function createConnection(p: InitConnector): void {

    initConnector(p);

    // reconnect when a new page is loaded.
    chrome.devtools.network.onNavigated.addListener(function onNavigated() {

        // background-passthrough will disconnect connection from devtools page (the port created here in initConnector)
        // when the port on the content script side is disconnected (on navigation too)
        // so create a new port here

        initConnector(p);
    });
}

function initConnector({devtoolsInstanceId, previousHookInstanceId, tabId, registryMirror, debugLog, options}: InitConnector): void {
    const port = chrome.runtime.connect({name: encodePortName({tabId, devtoolsInstanceId, previousHookInstanceId})});
    port.onDisconnect.addListener(disconnectListener);
    port.onMessage.addListener(connectionListener);
    connectionState?.setChannelState('connecting');

    function connectionListener(message: ChannelMessageFromPage): void {
        if (message.kind === 'helloAnswer') {
            connectionState?.setHookType(message.hookType);
            const channelState = connectedState(message);
            debugLog.log(
                'debug',
                `helloAnswer: hookType:${message.hookType} hook.deactivated:${message.deactivated ? 'yes' : 'no'} `
                + `devtoolsInstanceId:${devtoolsInstanceId} hookInstanceId:${message.hookInstanceId} `
                + `prev. devtoolsInstanceId in the hook:${message.previousDevtoolsInstanceId ?? 'undefined'} `
                + `prev. hookInstanceId here:${previousHookInstanceId ?? 'undefined'}`
            );
            if (channelState === 'connected') {
                initChannel();
            }
            // order is important because ChannelContext.Provider is inside the switch on the channelState
            // so channel state should be set after initChannel() so that when component tree is rendered for the first time, ChannelContext is already set
            // to avoid making sure that ChannelContext is accessed in reactive context (not sure if such dependency on the order is a good idea though)
            connectionState?.setChannelState(channelState);
            port.onMessage.removeListener(connectionListener);
        }
    }
    function initChannel() {
        const transport: Transport = {
            subscribe(fn: (message: Message) => void) {
                port.onMessage.addListener(fn);
                return () => port.onMessage.removeListener(fn);
            },
            send(message: Message) {
                port.postMessage(message);
            }
        };
        const channel = createChannel('devtools', transport);
        registryMirror.subscribe(channel);
        if (options.logAllMessages) {
            debugLog.subscribe(transport);
        }
        connectionState?.setChannel(channel);
    }
    function disconnectListener() {
        const channel = connectionState?.channel();
        debugLog.unsubscribe();
        channel && registryMirror.unsubscribe(channel);
        connectionState?.setChannelState('disconnected');
        connectionState?.setChannel(undefined);
        port.onMessage.removeListener(connectionListener);
        port.onDisconnect.removeListener(disconnectListener);
    }
}

function connectedState(message: HelloAnswer): ChannelState {
    return message.hookType === 'full' && !message.deactivated ? 'connected': 'connected-incapable';
}

export {createConnectionAndPanelIfSolidRegistered};
