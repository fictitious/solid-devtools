
import type {Channel} from './channel-message-types';
import {EventEmitterImpl} from './event-emitter';
import type {Listener} from './event-emitter';

export type BufferedChannel<Side extends 'devtools' | 'page'> = Channel<Side> & {
    connect(channel: Channel<Side>): void;
    disconnect(): void;
};

type ChannelImpl = EventEmitterImpl & {send(kind: string, content: {}): void};

class BufferedChannelImpl extends EventEmitterImpl {

    sendQueue: {kind: string; content: {}}[];
    channel: ChannelImpl | undefined;
    deactivated?: true;
    disconnectTimeMilliseconds: number;

    constructor(
        public timeoutAfterDisconnectSeconds: number,
        public onTimeoutAfterDisconnect: () => void
    ) {
        super();
        this.sendQueue = [];
        this.disconnectTimeMilliseconds = new Date().getTime();
    }

    send(kind: string, content: {}) {
        if (this.channel) {
            this.channel.send(kind, content);
        } else if (!this.deactivated) {
            const nowMilliseconds = new Date().getTime();
            if (nowMilliseconds - this.disconnectTimeMilliseconds > 1000 * this.timeoutAfterDisconnectSeconds) {
                this.deactivate();
            } else {
                this.sendQueue.push({kind, content});
            }
        }
    }

    deactivate() {
        this.onTimeoutAfterDisconnect();
        this.deactivated = true;
        this.sendQueue.length = 0;
    }

    addListener(kind: string, listener: Listener): void {
        this.channel?.addListener(kind, listener);
        super.addListener(kind, listener);
    }

    removeListener(kind: string, listener: Listener): void {
        this.channel?.removeListener(kind, listener);
        super.removeListener(kind, listener);
    }

    removeAllListeners() {
        this.channel?.removeAllListeners();
        super.removeAllListeners();
    }

    connect<Side extends 'devtools' | 'page'>(channel: Channel<Side>) {
        if (!this.deactivated) {
            this.channel = channel as ChannelImpl;
            for (const [kind, listeners] of this.listenersMap.entries()) {
                for (const listener of listeners) {
                    this.channel.addListener(kind, listener);
                }
            }
            for (const {kind, content} of this.sendQueue) {
                this.channel.send(kind, content);
            }
            this.sendQueue.length = 0;
            this.channel.addListener('shutdown', () => this.disconnect());
        }
    }

    disconnect() {
        if (this.channel) {
            for (const [kind, listeners] of this.listenersMap.entries()) {
                for (const listener of listeners) {
                    this.channel.removeListener(kind, listener);
                }
            }
            delete this.channel;
            this.disconnectTimeMilliseconds = new Date().getTime();
        }
    }
}

function createBufferedChannel<Side extends 'devtools' | 'page'>(_side: Side, timeoutAfterDisconnectSeconds: number, onTimeoutAfterDisconnect: () => void = () => {}): BufferedChannel<Side> {
    return new BufferedChannelImpl(timeoutAfterDisconnectSeconds, onTimeoutAfterDisconnect) as unknown as BufferedChannel<Side>;
}

export {createBufferedChannel};
