

import {createSignal} from 'solid-js';
import type {Accessor, Setter} from 'solid-js';

import type {HookType} from '../hook/hook-types';

// connected-incapable is when it's connected to the stub hook, or re-connected to the full hook which was deactivated
export type ChannelState = 'connecting' | 'connected' | 'connected-incapable' | 'disconnected';

export interface ConnectionState {
    hookType: Accessor<HookType>;
    setHookType: Setter<HookType>;

    channelState: Accessor<ChannelState>;
    setChannelState: Setter<ChannelState>;

    // ?? channel is here ?
}

function createConnectionState(initialHookType: HookType): ConnectionState {
    const [hookType, setHookType] = createSignal(initialHookType);
    const [channelState, setChannelState] = createSignal<ChannelState>('connecting');

    return {hookType, setHookType, channelState, setChannelState};
}

export {createConnectionState};
