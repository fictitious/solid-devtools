// This is the content script loaded into every page as declared in the manifest.json.
// It injects the-hook.js script into the page to create __SOLID_DEVTOOLS_GLOBAL_HOOK__ global
// which is accessible from solid code in the debugged page
// (it needs to be created in the injected script and not here because content scripts are running
// in the "isolated world" https://developer.chrome.com/docs/extensions/mv3/content_scripts/#isolated_world
// and have no access to global objects that belong to the "javascript in the page" world.

import nullthrows from 'nullthrows';

import type {HookMessage} from './hook/hook-message-types';
import {SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY, SESSION_STORAGE_DEVTOOLS_EXPOSE_NODE_IDS_KEY} from './devtools-page/storage-keys';
import {loadOptions} from './options/options';

function injectScript(path: string) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(path);

    // This script runs before the <head> element is created,
    // so we add the script to <html> instead.
    nullthrows(document.documentElement).appendChild(script);
    // then remove it because some other code may be inserting scripts
    // before or after the first one returned by getElementsByTagName(),
    // and their scripts will end up inserted in <html> before the <head> too
    nullthrows(script.parentNode).removeChild(script);
}

window.addEventListener('message', ({data, source}: {data?: HookMessage; source: MessageEventSource | null}) => {
    if (source === window && data?.category === 'solid-devtools-hook') {
        if (data.kind === 'solid-registered') {
            // pass it through to the background worker
            chrome.runtime.sendMessage(data);
        }
    }
});

// Inject __SOLID_DEVTOOLS_GLOBAL_HOOK__ global for Solid to interact with.
// Only do this for HTML documents though, to avoid e.g. breaking syntax highlighting for XML docs.
if ('text/html' === document.contentType) {
    const panelActivated = sessionStorage.getItem(SESSION_STORAGE_DEVTOOLS_PANEL_ACTIVATED_KEY);
    injectScript(panelActivated ? '/scripts/hook-main.js' : '/scripts/hook-stub.js');
}

void loadOptions()
.then(options => {
    sessionStorage.setItem(SESSION_STORAGE_DEVTOOLS_EXPOSE_NODE_IDS_KEY, options.exposeIds ? 'true' : '');
});
