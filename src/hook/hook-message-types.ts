
// Types for messages in the 'solid-devtools-hook' category - messages
// exchanged directly (using chrome.runtime.sendMessage) between
// the hook in the solid page and the background worker

export interface HookMessageCategory {
    category: 'solid-devtools-hook';
}

export interface HookMessageSolidRegistered extends HookMessageCategory {
    kind: 'solid-registered';
    buildType: 'development' | 'production';
}

export type HookMessage =
    | HookMessageSolidRegistered
;
