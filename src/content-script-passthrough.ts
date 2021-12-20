// based on contentScript.js from React Devtools

import type {ChannelMessageFromPage} from './channel/channel-message-types';
import {messageFromDevtools} from './channel/channel-message-types';

const port = chrome.runtime.connect({
    name: 'contentScript'
});

port.onMessage.addListener(message => window.postMessage(message, '*'));
port.onDisconnect.addListener(handleDisconnect);

window.addEventListener('message', handleMessageFromPage);
window.postMessage(messageFromDevtools('hello', {}), '*');


function handleMessageFromPage(e: MessageEvent<ChannelMessageFromPage>) {
    if (e.source === window && e.data?.category === 'solid-devtools-channel') {
        port.postMessage(e.data);
    }
}

function handleDisconnect() {
    window.removeEventListener('message', handleMessageFromPage);
    window.postMessage(messageFromDevtools('shutdown', {}), '*');
}
