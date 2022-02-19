// based on bridge.js from React Devtools

import type {Message, Transport} from './channel-transport-types';
import type {Channel} from './channel-types';
import type {Listener} from '../channel/event-emitter-types';
import {EventEmitterImpl, listenerListAdd, listenerListRemove, listenerListEmit} from '../channel/event-emitter';

const BATCH_DURATION_MILLISECONDS = 100;

class ChannelImpl extends EventEmitterImpl {

    transportUnsubscribe: () => void;
    isShutdown: boolean;
    messageQueue: Message[];
    timeoutID: ReturnType<typeof setTimeout> | undefined;
    shutdownListeners: Listener[];

    constructor(
        public side: 'devtools' | 'page',
        public transport: Transport
    ) {
        super();
        this.transportUnsubscribe = transport.subscribe(message => this.emit(message));
        this.isShutdown = false;
        this.messageQueue = [];
        this.shutdownListeners = [];
    }

    emit(message: Message) {
        super.emit(message);
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

    addShutdownListener(listener: Listener): void {
        listenerListAdd(this.shutdownListeners, listener);
    }

    removeShutdownListener(listener: Listener): void {
        listenerListRemove(this.shutdownListeners, listener);
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
            listenerListEmit(this.shutdownListeners, {});
            this.shutdownListeners = [];
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
