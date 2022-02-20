
import type {Accessor, Setter} from 'solid-js';

import type {Transport} from '../../channel/channel-transport-types';
import type {Channel} from '../../channel/channel-types';
import type {HookType, HelloAnswer, ChannelMessageFromPage} from '../../channel/channel-message-types';
import type {Logger} from '../data/logger-types';

// connected-incapable is when it's connected to the stub hook, or re-connected to the full hook which was deactivated
export type ChannelState = 'connecting' | 'connected' | 'connected-incapable' | 'disconnected';

export interface ConnectionState {

    hookType: Accessor<HookType>;
    setHookType: Setter<HookType>;

    channelState: Accessor<ChannelState>;
    setChannelState: Setter<ChannelState>;

    channel: Accessor<Channel<'devtools'> | undefined>;
    setChannel: Setter<Channel<'devtools'> | undefined>;

    canReconnect(helloAnswer: HelloAnswer): boolean;
    setChannelConnected(hookInstanceId?: string): void; // optional because after reconnect, previousHookInstanceId stays the same
    initPort(tabId: number, logger: Logger, connectionListener: (m: ChannelMessageFromPage) => void, disconnectListener: () => void): void;
    createTransport(): Transport;
    removeConnectionListener(): void;
    deletePort(): void;
    wasConnected(): boolean;
}

