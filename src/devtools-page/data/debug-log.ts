
import type {Options} from '../../options/options';
import type {Message, Transport} from '../../channel/channel';

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
class DebugLogImpl implements DebugLog {

    renderer: DebugLogRenderer | undefined;
    buffer: LogRecord[];
    transportUnsubscribe: (() => void) | undefined;

    constructor() {
        this.buffer = [];
    }

    attach(renderer: DebugLogRenderer): void {
        this.renderer = renderer;
        this.buffer.forEach(renderer);
        this.buffer.length = 0;
    }

    log(type: LogDebugMessage['type'], message: string): void {
        if (type === 'error') {
            console.error(message);
        } else if (type === 'warn') {
            console.warn(message);
        }
        this.addRecord({kind: 'debugMessage', type, message});
    }

    subscribe(transport: Transport): void {
        this.transportUnsubscribe = transport.subscribe(this.onTransportMessage);
    }

    unsubscribe(): void {
        this.transportUnsubscribe && this.transportUnsubscribe();
        delete this.transportUnsubscribe;
    }

    onTransportMessage = (message: Message) => {
        this.addRecord({kind: 'transportMessage', message});
    };

    addRecord(record: LogRecord) {
        if (this.renderer) {
            this.renderer(record);
        } else {
            this.buffer.push(record);
        }
    }

    logger(): Logger {
        return (type: LogDebugMessage['type'], message: string) => this.log(type, message);
    }
}

class NoDebugLogImpl implements DebugLog {

    attach(_renderer: DebugLogRenderer): void {
    }

    log(type: LogDebugMessage['type'], message: string): void {
        if (type === 'error') {
            console.error(message);
        } else if (type === 'warn') {
            console.warn(message);
        }
    }

    subscribe(_transport: Transport): void {
    }

    unsubscribe(): void {
    }

    logger(): Logger {
        return (type: LogDebugMessage['type'], message: string) => this.log(type, message);
    }
}

function createDebugLog(options: Options): DebugLog {
    return options.showLogPanel ? new DebugLogImpl() : new NoDebugLogImpl();
}

export {createDebugLog};
