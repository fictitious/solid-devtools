
import {render} from 'solid-js/web';

import type {ConnectionState} from './connection-state';
import {SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY} from './storage-keys';
import {ComponentsPanel} from './ui/components-panel';

function createPanel(connectionState: ConnectionState): void {
    let currentPanelWindow: Window | undefined;

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
                    clearInitialHTML(rootElement!);
                    render(() => <ComponentsPanel connectionState={connectionState} />, rootElement!);
//                    console.log(`components panel shown:`, rootElement);
                }
            });
        }
    );
}

function clearInitialHTML(element: HTMLElement & {_initialHTMLCleared?: boolean}) {
    if (!element._initialHTMLCleared) {
        element.innerHTML = '';
        element._initialHTMLCleared = true;
    }
}

export {createPanel};
