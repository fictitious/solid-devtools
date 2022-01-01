
import type {Accessor, Setter} from 'solid-js';

import type {Transport} from '../../channel/channel';
import type {Channel, HookType, HelloAnswer, ChannelMessageFromPage} from '../../channel/channel-message-types';
import type {Logger} from '../data/debug-log';

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
    setChannelConnected(hookInstanceId?: string): void; // after reconnect, previousHookInstanceId stays the same
    createPortIfNotYetCreated(tabId: number, logger: Logger, connectionListener: (m: ChannelMessageFromPage) => void, disconnectListener: () => void): void;
    createTransport(): Transport;
    removeConnectionListener(): void;
    deletePort(): void;
    wasConnected(): boolean;
}

