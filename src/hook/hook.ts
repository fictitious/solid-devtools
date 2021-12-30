// script to inject into the page when solid devtools panel is open

import type {ChannelMessageFromDevtools} from '../channel/channel-message-types';
import type {Message} from '../channel/channel';
import {createChannel} from '../channel/channel';
import type {BufferedChannel} from '../channel/buffered-channel';
import {createBufferedChannel} from '../channel/buffered-channel';
import {SESSION_STORAGE_DEVTOOLS_EXPOSE_NODE_IDS_KEY} from '../devtools-page/storage-keys';
import type {Registry} from './registry/registry';
import {createRegistry} from './registry/registry';
import {wrapComponent} from './registry/component-wrapper';
import {createInsertParentWrapper} from './registry/insert-parent-wrapper';
import type {HookFull, HookComponentWrapper, HookInsertParentWrapper, HookRegisterRoot} from './hook-types';
import {HookBaseImpl, installHook} from './hook-base';

class HookImpl extends HookBaseImpl implements HookFull {

    hookType: 'full';

    channel: BufferedChannel<'page'>;
    registry: Registry;

    updateComponentWrappers: ((newWrapper: HookComponentWrapper) => void)[];
    updateInsertParentWrappers: ((newWrapper: HookInsertParentWrapper) => void)[];
    updateRegisterRoots: ((newRegisterRoot: HookRegisterRoot) => void)[];

    constructor() {
        super();
        this.hookType = 'full';
        this.channel = createBufferedChannel('page', 5, () => {
            this.deactivate();
        });
        const exposeNodeIds = sessionStorage.getItem(SESSION_STORAGE_DEVTOOLS_EXPOSE_NODE_IDS_KEY);
        this.registry = createRegistry(this.channel, !!exposeNodeIds);

        this.updateComponentWrappers = [];
        this.updateInsertParentWrappers = [];
        this.updateRegisterRoots = [];

        this.channel.addListener('test-message', () => {
            console.log('test-message', this.registry);
        });
        this.channel.addListener('debugBreak', ({componentId}) => {
            const componentItem = this.registry.getComponent(componentId);
            componentItem?.setDebugBreak(true);
            setTimeout(() => componentItem?.setDebugBreak(false), 100);
        });
    }

    connectChannel(): void {
        this.channel.connect(createChannel('page', {
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
        }));
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
            return parent => createInsertParentWrapper(parent, this.registry, this.channel);
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
