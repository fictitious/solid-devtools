
// Types for messages in the 'solid-devtools-connector' category - messages
// exchanged between the devtools agent in the page and the devtools panel,
// which can happen after the connection is established. The way the messages go is
// agent in the solid page <-> relay in content script <-> relay in background workder <-> devtools page/panel

export interface ConnectorMessageCategory {
    category: 'solid-devtools-connector';
}
