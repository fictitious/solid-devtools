
import type {FromDevtools, FromPage, ChannelMessageFromPageMap, ChannelMessageFromDevtoolsMap} from './channel-message-types';

export interface ChannelBase {
    shutdown(): void;
    addShutdownListener(listener: () => void): void;
    removeShutdownListener(listener: () => void): void;
}

export interface ChannelDevtoolsSide extends ChannelBase {
    send<K extends keyof FromDevtools>(kind: K, content: FromDevtools[K][0]): void;
    addListener<K extends keyof FromPage>(kind: K, listener: (msg: ChannelMessageFromPageMap[K]) => void): void;
    removeListener<K extends keyof FromPage>(kind: K, listener: (msg: ChannelMessageFromPageMap[K]) => void): void;
}

export interface ChannelPageSide extends ChannelBase {
    send<K extends keyof FromPage>(kind: K, content: FromPage[K][0]): void;
    addListener<K extends keyof FromDevtools>(kind: K, listener: (msg: ChannelMessageFromDevtoolsMap[K]) => void): void;
    removeListener<K extends keyof FromDevtools>(m: K, listener: (msg: ChannelMessageFromDevtoolsMap[K]) => void): void;
}

export type Channel<Side extends 'devtools' | 'page'> = Side extends 'devtools' ? ChannelDevtoolsSide : ChannelPageSide;
