
import type {RegistryStateMessageNames, RegistryStateMessageMap, RegistryStateMessageNoSerialMap, FromPage} from '../../channel/channel-message-types';
import type {Channel} from '../../channel/channel-types';
import type {RegistryConnection} from './registry-types';

interface UnackedMessage<N extends RegistryStateMessageNames> {
    n: N;
    message: RegistryStateMessageMap[N];
}

abstract class RegistryConnectionImpl implements RegistryConnection {

    channel?: Channel<'page'>;
    unackedMessages: UnackedMessage<RegistryStateMessageNames>[];
    messageSerial: number;

    constructor() {
        this.unackedMessages = [];
        this.messageSerial = 0;
    }

    connect(channel: Channel<'page'>): void {
        this.channel = channel;
        this.unackedMessages.length = 0;
        this.sendSnapshot(channel);
    }

    reconnect(channel: Channel<'page'>): void {
        this.channel = channel;
        this.resendUnackedMessages(channel);
    }

    disconnect(): void {
        delete this.channel;
    }

    messageAck(serial: number): void {
        if (this.unackedMessages[0]?.message.messageSerial === serial) {
            this.unackedMessages.splice(0, 1);
        } else {
            const i = this.unackedMessages.findIndex(m => m.message.messageSerial === serial);
            if (i >= 0) {
                console.error(`RegistryConnectionImpl: out of order message ack: received serial is:${serial}, first unacked serial is:${this.unackedMessages?.[0].message.messageSerial ?? 'none'}`);
                this.unackedMessages.splice(i, 1);
            }
        }
    }

    sendRegistryMessage<N extends RegistryStateMessageNames>(n: N, m: RegistryStateMessageNoSerialMap[N]): void {
        const message = {...m, messageSerial: this.nextMessageSerial()}  as FromPage[N][0];
        if (this.channel) {
            this.channel.send(n, message);
        }
        this.unackedMessages.push({n, message});
    }

    resendUnackedMessages(channel: Channel<'page'>): void {
        this.unackedMessages.forEach(({n, message}) => channel.send(n, message));
    }

    nextMessageSerial() {
        return ++this.messageSerial;
    }

    abstract sendSnapshot(channel: Channel<'page'>): void;
}

export {RegistryConnectionImpl};
