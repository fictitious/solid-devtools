// based on main.js from React Devtools

import {globalHookName} from '../hook/hook-name';
import type {ChannelMessageFromPage, HelloAnswer} from '../channel/channel-message-types';
import {createChannel} from '../channel/channel';
import type {Message, Transport} from '../channel/channel';
import type {Options} from '../options/options';
import {loadOptions} from '../options/options';
import type {RegistryMirror} from './data/registry-mirror-types';
import {createRegistryMirror} from './data/registry-mirror';
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
                        const debugLog = createDebugLog(options);
                        const registryMirror = createRegistryMirror(debugLog.logger());
                        createConnection({tabId: chrome.devtools.inspectedWindow.tabId, registryMirror, debugLog, options});
                        createPanels(connectionState, registryMirror, options, debugLog);
                    });
                }
            }
        );
    }
}

export interface InitConnector {
    tabId: number;
    registryMirror: RegistryMirror;
    debugLog: DebugLog;
    options: Options;
}

function createConnection(p: InitConnector): void {

    initConnector(p);

    // reconnect when a new page is loaded.
    chrome.devtools.network.onNavigated.addListener(function onNavigated() {

        // background-relay will disconnect connection from devtools page (the port created here in initConnector)
        // when the port on the content script side is disconnected (on navigation too)
        // so create a new port here

        initConnector(p);
    });
}

function initConnector({tabId, registryMirror, debugLog, options}: InitConnector): void {
    const port = chrome.runtime.connect({
        name: String(tabId)
    });
    port.onDisconnect.addListener(disconnectListener);
    port.onMessage.addListener(connectionListener);
    connectionState?.setChannelState('connecting');

    function connectionListener(message: ChannelMessageFromPage): void {
        if (message.kind === 'helloAnswer') {
            connectionState?.setHookType(message.hookType);
            const channelState = connectedState(message);
            connectionState?.setChannelState(channelState);
            debugLog.log('debug', `helloAnswer: hookType:${message.hookType} hook.deactivated:${message.deactivated ? 'yes' : 'no'}`);
            if (channelState === 'connected') {
                initChannel();
            }
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
