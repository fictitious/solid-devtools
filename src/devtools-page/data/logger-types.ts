
import type {Transport, Message} from '../../channel/channel-transport-types';

export interface DebugLog {
    attach(renderer: DebugLogRenderer): void;
    log(type: LogDebugMessage['type'], message: string): void;
    logger(): Logger;
    subscribe(transport: Transport): void;
    unsubscribe(): void;
}

export type DebugLogRenderer = (logRecord: LogRecord) => void;

export interface LogTransportMessage {
    kind: 'transportMessage';
    message: Message;
}
export interface LogDebugMessage {
    kind: 'debugMessage';
    type: 'debug' | 'info' | 'warn' | 'error';
    message: string;
}
export type LogRecord = LogTransportMessage | LogDebugMessage;

export type Logger = (type: LogDebugMessage['type'], message: string) => void;
