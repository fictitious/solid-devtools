interface PortPair {
    devtools?: chrome.runtime.Port;
    contentScript?: chrome.runtime.Port;
}

const ports = Object.create(null) as Record<string, PortPair>;

function createBackgroundRelay(): void {

    chrome.runtime.onConnect.addListener(function(port) {
        let tab: string | undefined;
        let name: keyof PortPair | undefined;
        if (isNumericEnough(port.name)) {
            tab = port.name;
            if (tab) {
                name = 'devtools';
                port.onDisconnect.addListener(() => {
                    if (ports[tab!]) {
                        void chrome.scripting.executeScript({
                            target: {tabId: +tab!},
                            files: ['scripts/on-panel-deactivated.js']
                        });
                    }
                });
            }
            //        installContentScript(+port.name);
        } else {
            const tabId = port.sender?.tab?.id;
            if (tabId) {
                tab = tabId.toString();
                name = 'contentScript';
            }
        }
        if (tab !== undefined && name) {
            let pair = ports[tab];
            if (!pair) {
                pair = ports[tab] = {};
            }
            pair[name] = port;
            if (pair.devtools && pair.contentScript) {
                portRelay(tab, pair as Required<PortPair>);
            }
        }
    });
}

function portRelay(tabId: string, {devtools, contentScript}: Required<PortPair>): void {
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
        delete ports[tabId];
        devtools.onMessage.removeListener(devtoolsListener);
        contentScript.onMessage.removeListener(contentScriptListener);
        devtools.disconnect();
        contentScript.disconnect();
    }
}

function isNumericEnough(str: string): boolean {
    return `${+str}` === str;
}

export {createBackgroundRelay};
