interface PortPair {
    devtools?: chrome.runtime.Port;
    contentScript?: chrome.runtime.Port;
}

const ports = Object.create(null) as Record<string, PortPair>;

function createBackgroundRelay(): void {

    chrome.runtime.onConnect.addListener(function(port) {
        let tabId: string | undefined;
        let from: keyof PortPair | undefined;
        if (isNumericEnough(port.name)) {
            // connect from devtools page
            tabId = port.name;
            if (tabId) {
                from = 'devtools';
                injectContentScriptRelay(+tabId);
                port.onDisconnect.addListener(() => injectOnDevtoolsDisconnect(tabId!));
            }
        } else {
            // connect from content script
            const senderTabId = port.sender?.tab?.id;
            if (senderTabId) {
                tabId = senderTabId.toString();
                from = 'contentScript';
            }
        }
        if (tabId && from) {
            let pair = ports[tabId];
            if (!pair) {
                pair = ports[tabId] = {};
            }
            pair[from] = port;
            // setup relay when both are connected
            if (pair.devtools && pair.contentScript) {
                setupPortRelay(tabId, pair as Required<PortPair>);
            }
        }
    });
}

function setupPortRelay(tabId: string, {devtools, contentScript}: Required<PortPair>): void {
    devtools.onMessage.addListener(devtoolsListener);
    devtools.onDisconnect.addListener(shutdown);
    contentScript.onMessage.addListener(contentScriptListener);
    contentScript.onDisconnect.addListener(shutdown);
    function devtoolsListener(message: unknown) {
        contentScript.postMessage(message);
    }
    function contentScriptListener(message: unknown) {
        devtools.postMessage(message);
    }
    function shutdown() {
        delete ports[tabId]; // this avoids executing on-panel-deactivated.js script
                            // when disconnect was initiated from the content script side
        devtools.onMessage.removeListener(devtoolsListener);
        contentScript.onMessage.removeListener(contentScriptListener);
        devtools.disconnect();
        contentScript.disconnect();
    }
}

// not exactly isNumeric but good enough for tab ids
function isNumericEnough(str: string): boolean {
    return `${+str}` === str;
}

function injectContentScriptRelay(tabId: number) {
    void chrome.scripting.executeScript({target: {tabId}, files: ['scripts/content-script-relay.js']});
}

// when disconnect was initiated from the devtools side,
// execute script to remove 'devtools panel active' session storage item
function injectOnDevtoolsDisconnect(tabId: string) {
    if (ports[tabId]) {
        void chrome.scripting.executeScript({target: {tabId: +tabId}, files: ['scripts/on-panel-deactivated.js']});
    }
}

export {createBackgroundRelay};
