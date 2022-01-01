

import {nanoid} from 'nanoid';
import type {Accessor, Setter} from 'solid-js';
import {createSignal} from 'solid-js';

import type {Transport, Message} from '../../channel/channel-transport-types';
import type {HelloAnswer, HookType, ChannelMessageFromPage} from '../../channel/channel-message-types';
import type {Channel} from '../../channel/channel-types';
import {canReconnect} from '../../channel/can-reconnect';
import {encodePortName} from '../../channel/port-name';
import type {Logger} from '../data/logger-types';
import type {ConnectionState, ChannelState} from './connection-state-type';

class ConnectionStateImpl implements ConnectionState {

    devtoolsInstanceId: string;
    previousHookInstanceId?: string;
    port?: chrome.runtime.Port;
    removeConnectionListener: () => void;
    deletePort: () => void;

    hookType: Accessor<HookType>;
    setHookType: Setter<HookType>;

    channelState: Accessor<ChannelState>;
    setChannelState: Setter<ChannelState>;

    channel: Accessor<Channel<'devtools'> | undefined>;
    setChannel: Setter<Channel<'devtools'> | undefined>;

    constructor(initialHookType: HookType) {
        this.devtoolsInstanceId = nanoid();
        [this.hookType, this.setHookType] = createSignal(initialHookType);
        [this.channelState, this.setChannelState] = createSignal<ChannelState>('connecting');
        [this.channel, this.setChannel] = createSignal<Channel<'devtools'> | undefined>(undefined);
        this.removeConnectionListener = () => {};
        this.deletePort = () => {};
    }

    canReconnect(helloAnswer: HelloAnswer): boolean {
        return canReconnect(this, helloAnswer);
    }

    createPortIfNotYetCreated(tabId: number, logger: Logger, connectionListener: (m: ChannelMessageFromPage) => void, disconnectListener: () => void) {
        if (this.port) {
            logger('debug', `ConnectionStateImpl: createPortIfNotYetCreated: port already exists`);
        } else {
            logger('debug', `ConnectionStateImpl: createPortIfNotYetCreated tabId:${tabId} devtoolsInstanceId:${this.devtoolsInstanceId} previousHookInstanceId:${this.previousHookInstanceId ?? 'none'}`);
            const {devtoolsInstanceId, previousHookInstanceId} = this;
            const portName = encodePortName({tabId, devtoolsInstanceId, previousHookInstanceId});
            this.port = chrome.runtime.connect({name: portName});
            this.port.onDisconnect.addListener(disconnectListener);
            this.port.onMessage.addListener(connectionListener);
            this.setChannelState('connecting');
            this.removeConnectionListener = () => {
                this.port?.onMessage.removeListener(connectionListener);
                this.removeConnectionListener = () => {};
            };
            this.deletePort = () => {
                this.port?.onDisconnect.removeListener(disconnectListener);
                this.removeConnectionListener();
                delete this.port;
                this.setChannelState('disconnected');
                this.setChannel(undefined);
                this.deletePort = () => {};
            };
        }
    }

    createTransport(): Transport {
        return {
            subscribe: (fn: (message: Message) => void) => {
                this.port!.onMessage.addListener(fn);
                return () => this.port?.onMessage.removeListener(fn);
            },
            send: (message: Message) => {
                this.port!.postMessage(message);
            }
        };
    }

    setChannelConnected(hookInstanceId?: string): void {
        hookInstanceId && (this.previousHookInstanceId = hookInstanceId);
        this.setChannelState('connected');
    }

    wasConnected(): boolean {
        return !!this.previousHookInstanceId;
    }
}


function createConnectionState(initialHookType: HookType): ConnectionState {
    return new ConnectionStateImpl(initialHookType);
}

export {createConnectionState};
