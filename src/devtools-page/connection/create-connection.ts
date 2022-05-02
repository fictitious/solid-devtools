// based on main.js from React Devtools

import {devtoolsHookName} from 'solid-js';

import type {ChannelMessageFromPage, HelloAnswer} from '../../channel/channel-message-types';
import {createChannel} from '../../channel/channel';
import type {Options} from '../../options/options-types';
import {loadOptions} from '../../options/options';
import type {RegistryMirror, RegistryMirrorConnection} from '../registry-mirror/registry-mirror-types';
import {createRegistryMirror} from '../registry-mirror/registry-mirror';
import {createRegistryMirrorConnection} from '../registry-mirror/registry-mirror-connection';
import type {DebugLog} from '../data/logger-types';
import {createDebugLog} from '../data/logger';
import type {ConnectionState} from './connection-state-types';
import {createConnectionState} from './connection-state';
import {createPanels} from '../create-panels';

let connectionStateGlobal: ConnectionState | undefined;

function createConnectionAndPanelsIfSolidRegistered(cleanupOnSolidFirstDetected: () => void) {
    if (!connectionStateGlobal) {
        chrome.devtools.inspectedWindow.eval(
            `({solidRegistered: !!window.${devtoolsHookName}?.solidInstance, hookType: window.${devtoolsHookName}?.hookType})`,
            function({solidRegistered = false, hookType = ''}: {solidRegistered?: boolean; hookType?: string} = {}, exceptionInfo) {
                if (exceptionInfo) {
                    console.error(`inspectedWindow.eval failed on creating connection state: ${exceptionInfo.description}`, exceptionInfo);
                    return;
                }
                void loadOptions()
                .then(options => {
                    if (solidRegistered && !connectionStateGlobal) {
                        cleanupOnSolidFirstDetected();
                        connectionStateGlobal = createConnectionState(hookType === 'full' ? 'full' : 'stub');
                        const debugLog = createDebugLog(options);
                        const registryMirror = createRegistryMirror(debugLog.logger());
                        createConnection({
                            connectionState: connectionStateGlobal,
                            tabId: chrome.devtools.inspectedWindow.tabId,
                            registryMirror,
                            debugLog,
                            options
                        });
                        createPanels(connectionStateGlobal, registryMirror, options, debugLog);
                    }
                });
            }
        );
    }
}

interface InitConnector {
    connectionState: ConnectionState;
    tabId: number;
    registryMirror: RegistryMirror;
    debugLog: DebugLog;
    options: Options;
}

let afterDisconnectTimeout: number | undefined;

function clearAfterDisconnectTimeout() {
    if (afterDisconnectTimeout !== undefined) {
        clearTimeout(afterDisconnectTimeout);
        afterDisconnectTimeout = undefined;
    }
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

function initConnector({connectionState, tabId, registryMirror, debugLog, options}: InitConnector): void {
    clearAfterDisconnectTimeout();
    connectionState.initPort(tabId, debugLog.logger(), connectionListener, disconnectListener);

    let registryMirrorConnection: RegistryMirrorConnection | undefined;

    function connectionListener(message: ChannelMessageFromPage): void {
        if (message.kind === 'helloAnswer') {
            debugLog.log(
                'debug',
                `helloAnswer: hookType:${message.hookType} hook.deactivated:${message.deactivated ? 'yes' : 'no'} `
                + `hookInstanceId:${message.hookInstanceId} `
                + `prev. devtoolsInstanceId in the hook:${message.previousDevtoolsInstanceId ?? 'undefined'} `
            );
            connectionState.setHookType(message.hookType);
            const channelState = message.hookType === 'full' && !message.deactivated ? 'connected': 'connected-incapable';
            if (channelState === 'connected') {
                initChannel(message);
            } else {
                // if connected, channel state in the connection state is updated in the registryMirrorConnection, after the complete snapshot is received if necessary
                connectionState.setChannelState(channelState);
            }
            connectionState.removeConnectionListener();
        }
    }

    function initChannel(helloAnswer: HelloAnswer) {
        const transport = connectionState.createTransport();
        if (options.logAllMessages) {
            debugLog.subscribe(transport);
        }
        const channel = createChannel('devtools', transport);
        connectionState.setChannel(channel);
        // the order of setChannel(), then setChannelState() is important because ChannelContext.Provider is inside the switch on the channelState
        // so channel state should be set after setChannel() so that when component tree is rendered for the first time, ChannelContext is already set
        // to avoid making sure that ChannelContext is accessed in reactive context (not sure if such dependency on the order is a good idea though)
        registryMirrorConnection = createRegistryMirrorConnection(helloAnswer, connectionState, transport, registryMirror, debugLog.logger());
    }

    function disconnectListener() {
        debugLog.unsubscribe();
        registryMirrorConnection?.unsubscribe();
        connectionState.channel()?.shutdown();
        connectionState.deletePort();
        clearAfterDisconnectTimeout();
        // chrome will stop background worker after 5 minutes of inactivity, even if there's an open port
        // try to reconnect once if it happens
        afterDisconnectTimeout = setTimeout(
            () => initConnector({connectionState, tabId, registryMirror, debugLog, options}),
            250
        );
    }
}

export {createConnectionAndPanelsIfSolidRegistered};
