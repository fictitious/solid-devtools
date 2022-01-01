import {nanoid} from 'nanoid';

import type {ChannelMessageFromDevtools, Hello, HelloAnswer} from '../channel/channel-message-types';
import type {Message} from '../channel/channel-transport-types';
import type {Channel} from '../channel/channel-types';
import {createChannel} from '../channel/channel';
import {canReconnect} from '../channel/can-reconnect';
import {SESSION_STORAGE_DEVTOOLS_EXPOSE_NODE_IDS_KEY} from '../devtools-page/storage-keys';
import type {Registry} from './registry/registry-types';
import {createRegistry} from './registry/registry';
import {wrapComponent} from './registry/component-wrapper';
import {createInsertParentWrapper} from './registry/insert-parent-wrapper';
import type {Hook, HookComponentWrapper, HookInsertParentWrapper, HookRegisterRoot} from './hook-base';
import {HookBaseImpl, installHook} from './hook-base';

// this is the script to inject into the page when solid devtools panel is open

class HookImpl extends HookBaseImpl implements Hook {

    hookInstanceId: string;
    previousDevtoolsInstanceId?: string;
    registry: Registry;
    deactivated?: boolean;

    updateComponentWrappers: ((newWrapper: HookComponentWrapper) => void)[];
    updateInsertParentWrappers: ((newWrapper: HookInsertParentWrapper) => void)[];
    updateRegisterRoots: ((newRegisterRoot: HookRegisterRoot) => void)[];

    constructor() {
        super();
        this.hookInstanceId = nanoid();
        const exposeNodeIds = sessionStorage.getItem(SESSION_STORAGE_DEVTOOLS_EXPOSE_NODE_IDS_KEY);
        this.registry = createRegistry(!!exposeNodeIds);

        this.updateComponentWrappers = [];
        this.updateInsertParentWrappers = [];
        this.updateRegisterRoots = [];
    }

    connectChannel(hello: Hello): HelloAnswer {
        const channel = createChannel('page', {
            subscribe(fn: (message: Message) => void) {
                const listener = ({data, source}: MessageEvent<ChannelMessageFromDevtools | undefined>) => {
                    if (source === window && data?.category === 'solid-devtools-channel' && data.from === 'devtools') {
                        fn(data);
                    }
                };
                window.addEventListener('message', listener);
                return () => window.removeEventListener('message', listener);
            },
            send(message: Message) {
                window.postMessage(message);
            }
        });
        const helloAnswer: HelloAnswer = {
            hookType: 'full',
            deactivated: this.deactivated,
            hookInstanceId: this.hookInstanceId,
            previousDevtoolsInstanceId: this.previousDevtoolsInstanceId
        };
        this.previousDevtoolsInstanceId = hello.devtoolsInstanceId;
        void Promise.resolve().then(() => this.setupChannel(hello, helloAnswer, channel));
        return helloAnswer;
    }

    setupChannel(hello: Hello, helloAnswer: HelloAnswer, channel: Channel<'page'>): void {
        if (canReconnect(hello, helloAnswer)) {
            this.registry.reconnect(channel);
        } else {
            this.registry.connect(channel);
        }
        // TODO: figure out when to call this.deactivate()

        channel.addListener('devtoolsDisconnect', () => {
            this.registry.disconnect();
            channel.shutdown();
        });

        this.addChannelListeners(channel);
    }

    addChannelListeners(channel: Channel<'page'>) {
        channel.addListener('test-message', () => {
            console.log('test-message', this.registry);
        });
        channel.addListener('registryStateAck', ({messageSerial}) => this.registry.messageAck(messageSerial));
        channel.addListener('debugBreak', ({componentId}) => {
            const componentItem = this.registry.getComponent(componentId);
            componentItem?.setDebugBreak(true);
            setTimeout(() => componentItem?.setDebugBreak(false), 100);
        });
    }

    getComponentWrapper(updateWrapper: (newWrapper: HookComponentWrapper) => void): HookComponentWrapper {
        if (!this.deactivated) {
            this.updateComponentWrappers.push(updateWrapper);
            return comp => wrapComponent(comp, this.solidInstance!, this.registry);
        } else {
            return comp => comp;
        }
    }

    getInsertParentWrapper(updateWrapper: (newWrapper: HookInsertParentWrapper) => void): HookInsertParentWrapper {
        if (!this.deactivated) {
            this.updateInsertParentWrappers.push(updateWrapper);
            return parent => createInsertParentWrapper(parent, this.registry);
        } else {
            return parent => parent;
        }
    }

    getRegisterRoot(updateRegisterRoot: (newRegisterRoot: HookRegisterRoot) => void): HookRegisterRoot {
        if (!this.deactivated) {
            this.updateRegisterRoots.push(updateRegisterRoot);
            return node => {
                this.registry.registerRoot(node);
                return () => this.registry.unregisterRoot(node);
            };
        } else {
            return () => () => {};
        }
    }

    deactivate() {
        this.deactivated = true;
        for (const u of this.updateComponentWrappers) {
            u(comp => comp);
        }
        for (const u of this.updateInsertParentWrappers) {
            u(parent => parent);
        }
        for (const u of this.updateRegisterRoots) {
            u(() => () => {});
        }
    }
}

installHook(window, new HookImpl());
