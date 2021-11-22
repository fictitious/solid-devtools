import type {ConnectorMessageShutdown, ConnectorMessageHello, ConnectorMessageFromPage} from './connector-message-types';

const port = chrome.runtime.connect({
    name: 'contentScript'
});

port.onMessage.addListener(message => window.postMessage(message, '*'));
port.onDisconnect.addListener(handleDisconnect);

window.addEventListener('message', handleMessageFromPage);
sendHelloMessageToPage();


function sendHelloMessageToPage() {
    const helloMessage: ConnectorMessageHello = {category: 'solid-devtools-connector', kind: 'hello'};
    window.postMessage(helloMessage, '*');
}

function handleMessageFromPage(e: MessageEvent<ConnectorMessageFromPage>) {
    if (e.source === window && e.data?.category === 'solid-devtools-connector') {
        port.postMessage(e.data);
    }
}

function handleDisconnect() {
    window.removeEventListener('message', handleMessageFromPage);
    const shutdownMessage: ConnectorMessageShutdown = {category: 'solid-devtools-connector', kind: 'shutdown'};
    window.postMessage(shutdownMessage, '*');
}
