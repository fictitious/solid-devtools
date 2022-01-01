
import type {Component} from 'solid-js';
import {render} from 'solid-js/web';

import type {Options} from '../options/options-types';
import type {ConnectionState} from './connection/connection-state-types';
import {SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY} from './storage-keys';
import type {RootsData} from './data/component-data-types';
import type {RegistryMirror} from './registry-mirror/registry-mirror-types';
import type {DebugLog} from './data/logger-types';
import {ComponentsPanel} from './ui/components-panel';
import {DebugLogPanel} from './ui/debug-log-panel';

function createPanels(connectionState: ConnectionState, rootsData: RootsData, registryMirror: RegistryMirror, options: Options, debugLog: DebugLog): void {

    chrome.devtools.panels.create(
        'Components',
        '',
        'pages/panel.html',
        extensionPanel => {
            extensionPanel.onShown.addListener(panelWindow => {
                chrome.devtools.inspectedWindow.eval(
                    `sessionStorage.setItem('${SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY}', 'true')`
                );
                renderPanelOnce(panelWindow, () => <ComponentsPanel connectionState={connectionState} rootsData={rootsData} registryMirror={registryMirror} />);
            });
        }
    );

    if (options.showLogPanel) {
        chrome.devtools.panels.create(
            'Debug Log',
            '',
            'pages/panel.html',
            extensionPanel => {
                extensionPanel.onShown.addListener(panelWindow => {
                    renderPanelOnce(panelWindow, () => <DebugLogPanel debugLog={debugLog}/>);
                });
            }
        );
    }
}

const renderedPanelWindows: Set<Window> = new Set();

function renderPanelOnce(panelWindow: Window, ui: () => ReturnType<Component>): void {
    if (!renderedPanelWindows.has(panelWindow)) {
        renderedPanelWindows.add(panelWindow);
        panelWindow.addEventListener('unload', () => {
            // make sure it's rendered again after "reload frame"
            renderedPanelWindows.delete(panelWindow);
        });
        const rootElement = panelWindow.document.getElementById('root');
        clearInitialHTML(rootElement!);
        // NOTE: componentsWindow is an iframe, so rootElement is not from the document where this code is running.
        // It's OK (except for solid event delegaion) as long as all the code is here (no code is loaded in that iframe in panel.html)
        render(ui, rootElement!);
    }
}

function clearInitialHTML(element: HTMLElement & {_initialHTMLCleared?: boolean}) {
    if (!element._initialHTMLCleared) {
        element.innerHTML = '';
        element._initialHTMLCleared = true;
    }
}

export {createPanels};
