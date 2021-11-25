

import {globalHookName} from '../hook/hook-name';
import type {HookType} from '../hook/hook-types';
import type {ConnectorMessageFromPage, ConnectorMessageHelloAnswer} from '../connector-message-types';
import type {ConnectionState, ChannelState} from './connection-state';
import {createConnectionState} from './connection-state';
import {createPanel} from './create-panel';

let connectionState: ConnectionState | undefined;

function createConnectionAndPanelIfSolidDetected(cleanupOnSolidFirstDetected: () => void) {
    if (!connectionState) {
        chrome.devtools.inspectedWindow.eval(
            `({instanceCount: window.${globalHookName}?.solidInstances.size, hookType: window.${globalHookName}?.hookType})`,
            function({instanceCount = 0, hookType = ''}: {instanceCount: number; hookType: string}) {
                if (instanceCount > 0 && !connectionState) {
                    cleanupOnSolidFirstDetected();
                    createConnection(hookType === 'full' ? 'full' : 'stub');
                    createPanel(connectionState!);
                }
            }
        );
    }
}

function createConnection(initialHookType: HookType): void {

    connectionState = createConnectionState(initialHookType);
    const tabId = chrome.devtools.inspectedWindow.tabId;

    initConnector(tabId);

    // reconnect when a new page is loaded.
    chrome.devtools.network.onNavigated.addListener(function onNavigated() {
        // todo call cleanup here ??
//                flushSync(() => root.unmount());

        // background-relay will disconnect connection from devtools page (the port created here in initConnector)
        // when the port on the content script side is disconnected (on navigation too)
        // so create a new port here

        initConnector(tabId);
    });
}

function initConnector(tabId: number): chrome.runtime.Port {
    const port = chrome.runtime.connect({
        name: String(tabId)
    });
    port.onDisconnect.addListener(disconnectListener);
    port.onMessage.addListener(connectionListener);
    connectionState?.setChannelState('connecting');

    function connectionListener(message: ConnectorMessageFromPage): void {
        if (message.kind === 'helloAnswer') {
            connectionState?.setHookType(message.hookType);
            connectionState?.setChannelState(connectedState(message));
            port.onMessage.removeListener(connectionListener);
        }
    }
    function disconnectListener() {
        connectionState?.setChannelState('disconnected');
        port.onMessage.removeListener(connectionListener);
        port.onDisconnect.removeListener(disconnectListener);
    }
    return port;
}

function connectedState(message: ConnectorMessageHelloAnswer): ChannelState {
    return message.hookType === 'full' && !message.deactivated ? 'connected': 'connected-incapable';
}

export {createConnectionAndPanelIfSolidDetected};
