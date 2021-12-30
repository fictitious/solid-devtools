

import {nanoid} from 'nanoid';
import {createSignal} from 'solid-js';
import type {Accessor, Setter} from 'solid-js';

import type {Channel, HookType} from '../channel/channel-message-types';

// connected-incapable is when it's connected to the stub hook, or re-connected to the full hook which was deactivated
export type ChannelState = 'connecting' | 'connected' | 'connected-incapable' | 'disconnected';

export interface ConnectionState {
    devtoolsInstanceId: string;
    previousHookInstanceId?: string;

    hookType: Accessor<HookType>;
    setHookType: Setter<HookType>;

    channelState: Accessor<ChannelState>;
    setChannelState: Setter<ChannelState>;

    channel: Accessor<Channel<'devtools'> | undefined>;
    setChannel: Setter<Channel<'devtools'> | undefined>;
}

function createConnectionState(initialHookType: HookType): ConnectionState {
    const devtoolsInstanceId = nanoid();
    const [hookType, setHookType] = createSignal(initialHookType);
    const [channelState, setChannelState] = createSignal<ChannelState>('connecting');
    const [channel, setChannel] = createSignal<Channel<'devtools'> | undefined>(undefined);

    return {devtoolsInstanceId, hookType, setHookType, channelState, setChannelState, channel, setChannel};
}

export {createConnectionState};
