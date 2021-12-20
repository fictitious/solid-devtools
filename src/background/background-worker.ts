
import type {HookMessage} from '../hook/hook-message-types';
import {setIconAndPopup} from './action-popup';
import {createBackgroundPassthrough} from './background-passthrough';

createBackgroundPassthrough();

function isRestrictedBrowserPage(url: string | undefined) {
    return !url || new URL(url).protocol === 'chrome:';
}

function updateActionIfRestrictedPage(tab: chrome.tabs.Tab) {
    if (tab && isRestrictedBrowserPage(tab.url)) {
        setIconAndPopup('restricted', tab.id);
    }
}

chrome.tabs.query({}, tabs => tabs.forEach(updateActionIfRestrictedPage));
chrome.tabs.onCreated.addListener(updateActionIfRestrictedPage);

chrome.runtime.onMessage.addListener((message: HookMessage, sender) => {
    const tab = sender.tab;
    if (tab) {
        if (message.category === 'solid-devtools-hook') {
            if (message.kind === 'solid-registered') {
                setIconAndPopup(message.buildType, tab.id);
            }
        }
    }
});
