import {nanoid} from 'nanoid';
import type {Component, ComponentWrapper, HookInsertParentWrapper, HookRegisterDOMRoot, HookRegisterComputation, HookWrapSignal} from 'solid-js';

import type {ChannelMessageFromDevtools, Hello, HelloAnswer} from '../channel/channel-message-types';
import type {Message} from '../channel/channel-transport-types';
import type {Channel} from '../channel/channel-types';
import {canReconnect} from '../channel/can-reconnect';
import {SESSION_STORAGE_DEVTOOLS_EXPOSE_NODE_IDS_KEY, SESSION_STORAGE_DEVTOOLS_EXPOSE_DEBUGGER_HACK} from '../devtools-page/storage-keys';
import type {Registry} from './registry/registry-types';
import {solidDevtoolsKey} from './registry/registry-types';
import {createRegistry} from './registry/registry';
import {wrapComponent} from './wrappers/component-wrapper';
import {createInsertParentWrapper} from './wrappers/insert-parent-wrapper';
import {registerComputation, wrapSignal} from './wrappers/signal-wrappers';
import type {ChunkResult} from './chunk/chunk-types';
import type {Hook} from './hook-types';
import {HookBaseImpl, installHook} from './hook-base';

// this is the script to inject into the page when solid devtools panel is open

class HookImpl extends HookBaseImpl implements Hook {

    hookInstanceId: string;
    previousDevtoolsInstanceId?: string;
    registry: Registry;
    deactivated?: boolean;

    updateComponentWrappers: ((newWrapper: ComponentWrapper) => void)[];
    updateInsertParentWrappers: ((newWrapper: HookInsertParentWrapper) => void)[];
    updateRegisterDOMRoots: ((newRegisterDOMRoot: HookRegisterDOMRoot) => void)[];
    updateRegisterComputations: ((newRegister: HookRegisterComputation) => void)[];
    updateWrapSignals: ((newWrap: HookWrapSignal) => void)[];

    constructor() {
        super();
        this.hookInstanceId = nanoid();
        const exposeNodeIds = !!sessionStorage.getItem(SESSION_STORAGE_DEVTOOLS_EXPOSE_NODE_IDS_KEY);
        const exposeDebuggerHack = !!sessionStorage.getItem(SESSION_STORAGE_DEVTOOLS_EXPOSE_DEBUGGER_HACK);
        this.registry = createRegistry({exposeNodeIds, exposeDebuggerHack});

        this.updateComponentWrappers = [];
        this.updateInsertParentWrappers = [];
        this.updateRegisterDOMRoots = [];
        this.updateRegisterComputations = [];
        this.updateWrapSignals = [];
    }

    connectChannel(hello: Hello, sendAnswer: (answer: HelloAnswer) => void): void {
        this.chunkResult.then(({createChannel, highlightComponent, stopHighlightComponent, startInspecting, stopInspecting}) => {
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

            channel.addListener('devtoolsDisconnect', () => {
                this.registry.disconnect();
                channel.shutdown();
            });

            this.addChannelListeners(channel, {highlightComponent, stopHighlightComponent, startInspecting, stopInspecting});
            // TODO: figure out when to call this.deactivate() - ? in channel.addShutdownListener set 5 min? timer for it, clear timer in connectChannel

            sendAnswer(helloAnswer);

            this.onChannelReady(hello, helloAnswer, channel); // channel is not ready until after the helloAnswer is sent
        })
        .catch(error => console.error(error))
        ;
    }

    onChannelReady(hello: Hello, helloAnswer: HelloAnswer, channel: Channel<'page'>): void {
        if (canReconnect(hello, helloAnswer)) {
            this.registry.reconnect(channel);
        } else {
            this.registry.connect(channel);
        }
    }

    addChannelListeners(channel: Channel<'page'>, {highlightComponent, stopHighlightComponent, startInspecting, stopInspecting}: Omit<ChunkResult, 'createChannel'>) {
        channel.addListener('test-message', () => {
            console.log('test-message', this.registry);
        });
        channel.addListener('registryStateAck', ({messageSerial}) => this.registry.messageAck(messageSerial));
        channel.addListener('setComponentWatchingSignals', m => this.setComponentWatchingSignals(m));
        channel.addListener('highlightComponent', ({componentId}) => highlightComponent(componentId, this.registry));
        channel.addListener('stopHighlightComponent', stopHighlightComponent);
        channel.addListener('startInspectingElements', () => startInspecting(channel, solidDevtoolsKey));
        channel.addListener('stopInspectingElements', stopInspecting);
        channel.addListener('debugBreak', ({componentId}) => {
            const componentItem = this.registry.getComponent(componentId);
            if (componentItem?.setDebugBreak) {
                componentItem.setDebugBreak(true);
                setTimeout(() => componentItem.setDebugBreak?.(false), 100);
            }
        });
    }

    setComponentWatchingSignals({componentId, watching}: {componentId: string; watching: boolean}) {
        const component = this.registry.getComponent(componentId);
        component?.setWatchingSignals(watching);
    }

    isActive() {
        return !this.deactivated;
    }

    getComponentWrapper(updateWrapper: (newWrapper: ComponentWrapper) => void): ComponentWrapper {
        if (!this.deactivated) {
            this.updateComponentWrappers.push(updateWrapper);
            return comp => wrapComponent(comp as Component, this.solidInstance!, this.registry);
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

    getRegisterDOMRoot(updateRegisterDOMRoot: (newRegisterDOMRoot: HookRegisterDOMRoot) => void): HookRegisterDOMRoot {
        if (!this.deactivated) {
            this.updateRegisterDOMRoots.push(updateRegisterDOMRoot);
            return node => {
                this.registry.registerDOMRoot(node);
                return () => this.registry.unregisterDOMRoot(node);
            };
        } else {
            return () => () => {};
        }
    }

    getRegisterComputation(updateRegister: (newRegister: HookRegisterComputation) => void): HookRegisterComputation {
        if (!this.deactivated) {
            this.updateRegisterComputations.push(updateRegister);
            return c => registerComputation(c);
        } else {
            return () => {};
        }
    }

    getWrapSignal(updateWrap: (newWrap: HookWrapSignal) => void): HookWrapSignal {
        if (!this.deactivated) {
            this.updateWrapSignals.push(updateWrap);
            return (setter, signalState, name) => wrapSignal({setter, signalState, name, solidInstance: this.solidInstance, registry: this.registry});
        } else {
            return setter => setter;
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
        for (const u of this.updateRegisterDOMRoots) {
            u(() => () => {});
        }
        for (const u of this.updateRegisterComputations) {
            u(() => {});
        }
        for (const u of this.updateWrapSignals) {
            u(setter => setter);
        }
    }
}

installHook(window, new HookImpl());
