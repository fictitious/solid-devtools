
import {globalHookName} from './hook/hook-name';
import {SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY} from './storage-keys';

chrome.devtools.network.onNavigated.addListener(checkPageForSolid);

// Load (or reload) the DevTools extension when the user navigates to a new page.
function checkPageForSolid() {
    createPanelIfSolidLoaded();
}

// Check to see if Solid has loaded once per second in case Solid is added after page load
const loadCheckInterval = setInterval(function() {
    createPanelIfSolidLoaded();
}, 1000);

let panelCreated = false; // this should be devtoolsPageStore really, keeping tabId, connector etc

createPanelIfSolidLoaded();

function createPanelIfSolidLoaded() {
    if (!panelCreated) {
        chrome.devtools.inspectedWindow.eval(
            `window.${globalHookName} ? {instanceCount: window.${globalHookName}.solidInstances.size, hookType: window.${globalHookName}.hookType} : {}`,
            function({instanceCount = 0, hookType = ''}: {instanceCount: number; hookType: string}) {
                if (instanceCount > 0 && !panelCreated) {
                    panelCreated = true;
                    createPanel();
                }
            }
        );
    }
}

function createPanel(): void {
    let currentPanelWindow: Window | undefined;

    clearInterval(loadCheckInterval);

    const tabId = chrome.devtools.inspectedWindow.tabId;
    initConnector(tabId);
    chrome.devtools.panels.create(
        'Components',
        '',
        'pages/panel.html',
        extensionPanel => {
            extensionPanel.onShown.addListener(panelWindow => {
                chrome.devtools.inspectedWindow.eval(
                    `sessionStorage.setItem('${SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY}', 'true')`
                );
                if (currentPanelWindow !== panelWindow) {
                    currentPanelWindow = panelWindow;
                    const rootElement = panelWindow.document.getElementById('root');
                    console.log(`components panel shown:`, rootElement);
                }
            });
        }
    );

    chrome.devtools.network.onNavigated.removeListener(checkPageForSolid);

    // Re-initialize DevTools panel when a new page is loaded.
    chrome.devtools.network.onNavigated.addListener(function onNavigated() {
        // todo call cleanup here
//                flushSync(() => root.unmount());

        initConnector(tabId);
    });
}

function initConnector(tabId: number) {
    const port = chrome.runtime.connect({
        name: String(tabId)
    });
}
