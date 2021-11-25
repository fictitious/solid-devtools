
// Types for messages in the 'solid-devtools-connector' category - messages
// exchanged between the devtools agent in the page and the devtools panel,
// which can happen after the connection is established. The way the messages go is
// agent in the solid page <-> relay in content script <-> relay in background workder <-> devtools page/panel

import type {HookType} from './hook/hook-types';

export interface ConnectorMessageCategory {
    category: 'solid-devtools-connector';
}

export interface ConnectorMessageShutdown extends ConnectorMessageCategory {
    kind: 'shutdown';
}

export interface ConnectorMessageHello extends ConnectorMessageCategory {
    kind: 'hello';
}

// sent when devtools detects that page navigated to the new URL
// so that background page can inject the content-script-relay again
export interface ConnectorMessageHelloAgain extends ConnectorMessageCategory {
    kind: 'helloAgain';
}


export type ConnectorMessageFromDevtools =
    | ConnectorMessageHello
    | ConnectorMessageHelloAgain
    | ConnectorMessageShutdown
;

export interface ConnectorMessageHelloAnswer extends ConnectorMessageCategory {
    kind: 'helloAnswer';
    hookType: HookType;
    deactivated?: boolean; // true if 'full' hook was deactivated after devtools has disconnected
}

export interface ConnectorMessagePageDisconnect extends ConnectorMessageCategory {
    kind: 'pageDisconnect';
}

export type ConnectorMessageFromPage =
    | ConnectorMessageHelloAnswer
    | ConnectorMessagePageDisconnect
;
