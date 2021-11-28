// based on bridge.js from React Devtools

import {EventEmitterImpl} from './event-emitter';
import type {Channel} from './channel-message-types';

export interface Message {
    kind: string;
}

export interface Transport {
    subscribe(fn: (message: Message) => void): () => void;
    send(message: Message): void;
}

const BATCH_DURATION_MILLISECONDS = 100;

class ChannelImpl extends EventEmitterImpl {

    transportUnsubscribe: () => void;
    isShutdown = false;
    messageQueue: Message[] = [];
    timeoutID: ReturnType<typeof setTimeout> | undefined;

    constructor(
        public side: 'devtools' | 'page',
        public transport: Transport
    ) {
        super();
        this.transportUnsubscribe = transport.subscribe(message => this.emit(message));
    }

    emit(message: Message) {
        super.emit(message);
        if (message.kind === 'shutdown') {
            this.shutdown();
        }
    }

    send(kind: string, content: {}) {
        if (this.isShutdown) {
            console.warn(`cannot send message ${kind} via channel that has been shutdown`);
        } else {
            const message = Object.assign({}, {category: 'solid-devtools-channel', from: this.side, kind}, content);
            this.messageQueue.push(message);
            if (this.timeoutID === undefined) {
                this.timeoutID = setTimeout(this.flush, 0);
            }
        }
    }

    shutdown() {
        if (!this.isShutdown) {
            this.isShutdown = true;
            this.addListener = () => {};
            this.emit = () => {};
            this.removeAllListeners();
            this.transportUnsubscribe();
            do {
                this.flush();
            } while (this.messageQueue.length);
            this.clearFlushTimeout();
        }
    }

    clearFlushTimeout = () => {
        if (this.timeoutID !== undefined) {
            clearTimeout(this.timeoutID);
            delete this.timeoutID;
        }
    };

    flush = () => {
        this.clearFlushTimeout();
        if (this.messageQueue.length) {
            this.messageQueue.forEach(message => this.transport.send(message));
            this.messageQueue = [];
            this.timeoutID = setTimeout(this.flush, BATCH_DURATION_MILLISECONDS);
        }
    };
}

function createChannel<Side extends 'devtools' | 'page'>(side: Side, transport: Transport): Channel<Side> {
    return new ChannelImpl(side, transport) as unknown as Channel<Side>;
}

export {createChannel};
