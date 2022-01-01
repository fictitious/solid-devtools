
import type {FromDevtools, FromPage, ChannelMessageFromPageMap, ChannelMessageFromDevtoolsMap} from './channel-message-types';

export type Channel<Side extends 'devtools' | 'page'> =
    Side extends 'devtools' ? {
        send<K extends keyof FromDevtools>(kind: K, content: FromDevtools[K][0]): void;
        addListener<K extends keyof FromPage>(kind: K, listener: (msg: ChannelMessageFromPageMap[K]) => void): void;
        removeListener<K extends keyof FromPage>(kind: K, listener: (msg: ChannelMessageFromPageMap[K]) => void): void;
        shutdown(): void;
    } : {
        send<K extends keyof FromPage>(kind: K, content: FromPage[K][0]): void;
        addListener<K extends keyof FromDevtools>(kind: K, listener: (msg: ChannelMessageFromDevtoolsMap[K]) => void): void;
        removeListener<K extends keyof FromDevtools>(m: K, listener: (msg: ChannelMessageFromDevtoolsMap[K]) => void): void;
        shutdown(): void;
    }
;
