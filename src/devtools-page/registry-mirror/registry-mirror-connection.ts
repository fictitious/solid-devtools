
import type {Transport, Message} from '../../channel/channel-transport-types';
import type {RegistryStateMessageNames, RegistryStateMessageWithKind, RegistrySnapshotMessageNames, RegistrySnapshotMessageWithKind, HelloAnswer} from '../../channel/channel-message-types';
import {registryStateMessageNames, registrySnapshotMessageNames, messageFromDevtools} from '../../channel/channel-message-types';
import type {Logger} from '../data/logger-types';
import type {ConnectionState} from '../connection/connection-state-types';
import type {RegistryMirror, RegistryMirrorConnection} from './registry-mirror-types';
import {restoreMirrorFromSnapshot} from './restore-from-snapshot';

class RegistryMirrorConnectionImpl {

    receivingSnapshot?: boolean;
    lastAppliedMessageSerial?: number;
    transportUnsubscribe: (() => void) | undefined;

    constructor(
        public helloAnswer: HelloAnswer,
        public connectionState: ConnectionState,
        public transport: Transport,
        public registryMirror: RegistryMirror,
        public logger: Logger
    ) {
        if (this.connectionState.canReconnect(this.helloAnswer)) {
            connectionState.setChannelConnected();
            this.logger('debug', `RegistryMirrorConnectionImpl: reconnecting`);
        } else {
            this.logger('debug', `RegistryMirrorConnectionImpl: ${connectionState.wasConnected() ? `can not reconnect. Restoring registry mirror from snapshot` : `receiving initial snapshot`}`);
            this.receivingSnapshot = true;
            this.registryMirror.clear();
        }
        this.transportUnsubscribe = transport.subscribe(this.onTransportMessage);
    }

    onTransportMessage = (message: Message) => {
        if (isRegistryStateMessage(message)) {
            if (this.receivingSnapshot) {
                this.logger('error', `RegistryMirrorConnectionImpl: received registry state message while receiving registry snapshot`);

            } else if (this.lastAppliedMessageSerial === undefined || message.messageSerial <= this.lastAppliedMessageSerial + 1) {
                // apply message if the serial is in order
                // in case acks were lost, do not apply, but still acknowledge already applied messages
                if (this.lastAppliedMessageSerial === undefined || message.messageSerial === this.lastAppliedMessageSerial + 1) {
                    (this.registryMirror[message.kind] as (p: RegistryStateMessageWithKind) => void)(message);
                    this.lastAppliedMessageSerial = message.messageSerial;
                }
                this.transport.send(messageFromDevtools('registryStateAck', {messageSerial: message.messageSerial}));

            } else {
                this.logger('error', `RegistryMirrorConnectionImpl: received out of order registry state message`);
            }
        } else if (isRegistrySnapshotMessage(message)) {
            if (!this.receivingSnapshot) {
                this.logger('error', `RegistryMirrorConnectionImpl: received registry snapshot message while not expecting registry snapshot`);
            } else {
                if (message.kind === 'snapshotCompleted') {
                    this.receivingSnapshot = false;
                    // both sides are in sync now, and reconnect becomes possible
                    this.connectionState.setChannelConnected(this.helloAnswer.hookInstanceId);
                } else {
                    restoreMirrorFromSnapshot(this.registryMirror, message);
                }
            }
        }
    };

    unsubscribe = () => {
        this.transportUnsubscribe?.();
        delete this.transportUnsubscribe;
    };
}

function isRegistryStateMessage(message: Message): message is RegistryStateMessageWithKind {
    return registryStateMessageNames.includes(message.kind as RegistryStateMessageNames);
}

function isRegistrySnapshotMessage(message: Message): message is RegistrySnapshotMessageWithKind {
    return registrySnapshotMessageNames.includes(message.kind as RegistrySnapshotMessageNames);
}

function createRegistryMirrorConnection(helloAnswer: HelloAnswer, connectionState: ConnectionState, transport: Transport, registryMirror: RegistryMirror, logger: Logger): RegistryMirrorConnection {
    return new RegistryMirrorConnectionImpl(helloAnswer, connectionState, transport, registryMirror, logger);
}

export {createRegistryMirrorConnection};
