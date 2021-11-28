

import {createSignal} from 'solid-js';
import type {Accessor, Setter} from 'solid-js';

import type {HookType} from '../hook/hook-types';
import type {Channel} from '../channel/channel-message-types';

// connected-incapable is when it's connected to the stub hook, or re-connected to the full hook which was deactivated
export type ChannelState = 'connecting' | 'connected' | 'connected-incapable' | 'disconnected';

export interface ConnectionState {
    hookType: Accessor<HookType>;
    setHookType: Setter<HookType>;

    channelState: Accessor<ChannelState>;
    setChannelState: Setter<ChannelState>;

    channel: Accessor<Channel<'devtools'> | undefined>;
    setChannel: Setter<Channel<'devtools'> | undefined>;
}

function createConnectionState(initialHookType: HookType): ConnectionState {
    const [hookType, setHookType] = createSignal(initialHookType);
    const [channelState, setChannelState] = createSignal<ChannelState>('connecting');
    const [channel, setChannel] = createSignal<Channel<'devtools'> | undefined>(undefined);

    return {hookType, setHookType, channelState, setChannelState, channel, setChannel};
}

export {createConnectionState};
