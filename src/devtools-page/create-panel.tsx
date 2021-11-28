
import {render} from 'solid-js/web';

import type {ConnectionState} from './connection-state';
import {SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY} from './storage-keys';
import {ComponentsPanel} from './ui/components-panel';

function createPanel(connectionState: ConnectionState): void {

    chrome.devtools.panels.create(
        'Components',
        '',
        'pages/panel.html',
        extensionPanel => {
            extensionPanel.onShown.addListener(panelWindow => {
                chrome.devtools.inspectedWindow.eval(
                    `sessionStorage.setItem('${SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY}', 'true')`
                );
                renderComponentsPanelOnce(panelWindow);
            });
        }
    );

    let renderedComponentsWindow: Window | undefined;

    function renderComponentsPanelOnce(componentsWindow: Window) {
        if (renderedComponentsWindow !== componentsWindow) {
            renderedComponentsWindow = componentsWindow;
            componentsWindow.addEventListener('unload', () => {
                // make sure it's rendered again after "reload frame"
                renderedComponentsWindow = undefined;
            });
            const rootElement = componentsWindow.document.getElementById('root');
            clearInitialHTML(rootElement!);
            // NOTE: componentsWindow is an iframe, so rootElement is not from the document where this code is running.
            // It's OK (except for solid event delegaion) as long as all the code is here (no code is loaded in that iframe in panel.html)
            render(() => <ComponentsPanel connectionState={connectionState} />, rootElement!);
        }
    }
}

function clearInitialHTML(element: HTMLElement & {_initialHTMLCleared?: boolean}) {
    if (!element._initialHTMLCleared) {
        element.innerHTML = '';
        element._initialHTMLCleared = true;
    }
}

export {createPanel};
