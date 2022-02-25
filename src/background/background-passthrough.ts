
import {decodePortName} from '../channel/port-name';
import {messageFromDevtools} from '../channel/channel-message-types';

// based on doublePipe() in background.js from React Devtools

interface PassthroughPorts {
    devtoolsPort?: chrome.runtime.Port;
    contentScriptPort?: chrome.runtime.Port;
}
interface Passthrough extends PassthroughPorts {
    helloData?: {
        devtoolsInstanceId: string;
        previousHookInstanceId?: string;
    };
}

const passthroughs = Object.create(null) as Record<string, Passthrough>;

function createBackgroundPassthrough(): void {

    chrome.runtime.onConnect.addListener(function(port) {
        let tabId: string | undefined;
        let from: keyof PassthroughPorts | undefined;
        const portName = decodePortName(port.name);
        if (portName) {
            // connect from devtools page
            tabId = portName.tabId.toString();
            from = 'devtoolsPort';
            injectContentScriptPassthrough(portName.tabId);
            port.onDisconnect.addListener(() => injectOnDevtoolsDisconnect(tabId!));
        } else {
            // connect from content script
            const senderTabId = port.sender?.tab?.id;
            if (senderTabId) {
                tabId = senderTabId.toString();
                from = 'contentScriptPort';
            }
        }
        if (tabId && from) {
            let ps = passthroughs[tabId];
            if (!ps) {
                ps = passthroughs[tabId] = {};
            }
            if (portName) {
                ps.helloData = {
                    devtoolsInstanceId: portName.devtoolsInstanceId,
                    previousHookInstanceId: portName.previousHookInstanceId
                };
            }
            ps[from] = port;
            // setup message passthrough when both sides are connected
            // note that the devtools side is always the first to connect
            // (the content script side connects from the script injected by injectContentScriptPassthrough here)
            // and it provides helloData in the port name
            if (ps.devtoolsPort && ps.contentScriptPort) {
                setupMessagePassthrough(tabId, ps as Required<Passthrough>);
            }
        }
    });
}

function setupMessagePassthrough(tabId: string, {devtoolsPort, contentScriptPort, helloData}: Required<Passthrough>): void {
    devtoolsPort.onMessage.addListener(devtoolsListener);
    devtoolsPort.onDisconnect.addListener(shutdown);
    contentScriptPort.onMessage.addListener(contentScriptListener);
    contentScriptPort.onDisconnect.addListener(shutdown);

    contentScriptPort.postMessage(messageFromDevtools('hello', helloData));

    function devtoolsListener(message: unknown) {
        try {
            contentScriptPort.postMessage(message);
        } catch {
            // ignore
        }
    }
    function contentScriptListener(message: unknown) {
        try {
            devtoolsPort.postMessage(message);
        } catch {
            // ignore
        }
    }
    function shutdown() {
        delete passthroughs[tabId]; // this avoids executing on-panel-deactivated.js script
                            // when disconnect was initiated from the content script side
        devtoolsPort.onMessage.removeListener(devtoolsListener);
        contentScriptPort.onMessage.removeListener(contentScriptListener);
        devtoolsPort.disconnect();
        contentScriptPort.disconnect();
    }
}

function injectContentScriptPassthrough(tabId: number) {
    void chrome.scripting.executeScript({target: {tabId}, files: ['scripts/content-script-passthrough.js']});
    void chrome.scripting.executeScript({target: {tabId}, files: ['scripts/hook-chunk.js'], world: 'MAIN'} as chrome.scripting.ScriptInjection);
}

// when disconnect was initiated from the devtools side,
// execute script to remove 'devtools panel active' session storage item
function injectOnDevtoolsDisconnect(tabId: string) {
    if (passthroughs[tabId]) {
        void chrome.scripting.executeScript({target: {tabId: +tabId}, files: ['scripts/on-panel-deactivated.js']});
    }
}

export {createBackgroundPassthrough};
