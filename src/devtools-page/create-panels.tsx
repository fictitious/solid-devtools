
import type {JSX} from 'solid-js';
import {render} from 'solid-js/web';

import type {Options} from '../options/options-types';
import type {ConnectionState} from './connection/connection-state-types';
import {SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY} from './storage-keys';
import type {RegistryMirror} from './registry-mirror/registry-mirror-types';
import type {DebugLog} from './data/logger-types';
import {ComponentsPanel} from './ui/components-panel';
import {DebugLogPanel} from './ui/debug-log-panel';

function createPanels(connectionState: ConnectionState, registryMirror: RegistryMirror, options: Options, debugLog: DebugLog): void {

    chrome.devtools.panels.create(
        'Components',
        '',
        'pages/panel.html',
        extensionPanel => {
            extensionPanel.onShown.addListener(panelWindow => {
                chrome.devtools.inspectedWindow.eval(
                    `sessionStorage.setItem('${SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY}', 'true')`,
                    (_, exceptionInfo) => {
                        if (exceptionInfo) {
                            debugLog.log('error', `inspectedWindow.eval sessionStorage.setItem failed (components panel onShown): ${exceptionInfo.description}`);
                        }
                    }
                );
                renderPanelOnce(panelWindow, () => <ComponentsPanel connectionState={connectionState} registryMirror={registryMirror} options={options}/>);
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
                    renderPanelOnce(panelWindow, () => <DebugLogPanel debugLog={debugLog} channel={connectionState.channel} registryMirror={registryMirror}/>);
                });
            }
        );
    }
}

const renderedPanelWindows: Set<Window> = new Set();

function renderPanelOnce(panelWindow: Window, ui: () => JSX.Element): void {
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
        // see panel.js
        (panelWindow as unknown as {injectStyles: (getStyleTags: () => unknown[]) => void}).injectStyles(cloneStyleTags);
    }
}

function clearInitialHTML(element: HTMLElement & {_initialHTMLCleared?: boolean}) {
    if (!element._initialHTMLCleared) {
        element.innerHTML = '';
        element._initialHTMLCleared = true;
    }
}

function cloneStyleTags() {
    const linkTags: HTMLLinkElement[] = [];
    Array.prototype.forEach.call(document.getElementsByTagName('link'), (linkTag: HTMLLinkElement) => {
        if (linkTag.rel === 'stylesheet') {
            const newLinkTag = document.createElement('link');
            Array.prototype.forEach.call(linkTag.attributes, (attribute: Attr) => {
                newLinkTag.setAttribute(attribute.nodeName, attribute.nodeValue!);
            });
            linkTags.push(newLinkTag);
        }
    });
    return linkTags;
}

export {createPanels};
