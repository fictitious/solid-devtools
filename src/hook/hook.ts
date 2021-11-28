// script to inject into the page when solid devtools panel is open

import type {Component} from 'solid-js';

import type {Channel, ChannelMessageFromDevtools} from '../channel/channel-message-types';
import {createChannel} from '../channel/channel';
import type {Message} from '../channel/channel';
import type {Hook, ComponentWrapper} from './hook-types';
import {HookBaseImpl, installHook} from './hook-base';

interface ComponentItem {
    comp: Component;
    props?: {};
    parent?: ComponentItem;
    result?: ComponentResult[];
    contained?: ComponentItem[];
}

export type SingleComponentResult = ReturnType<Component> | ((props?: Record<string, unknown>) => ComponentResult);
export type ComponentResult = SingleComponentResult | ComponentResult[];

class HookImpl extends HookBaseImpl implements Hook {

    hookType = 'full' as const;
    componentStack: ComponentItem[] = [];
    roots: ComponentItem[] = [];
    channel: Channel<'page'> | undefined;

    initChannel(): void {
        this.channel = createChannel('page', {
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
        this.channel.addListener('test-message', () => {
            console.log('test-message', this.roots);
        });
    }

    getComponentWrapper(_updateWrapper: (newWrapper: ComponentWrapper) => void): ComponentWrapper {
        return comp => this.wrapComponent(comp);
    }

    wrapComponent(comp: Component): (props?: Record<string, unknown>) => ComponentResult {
        const wrapper = (props?: Record<string, unknown>) => {
            let result: ReturnType<Component> | undefined;
            const parent = this.componentStack[this.componentStack.length - 1];
            const componentItem: ComponentItem = {comp, props, parent};
            this.componentStack.push(componentItem);
            if (parent) {
                if (!parent.contained) {
                    parent.contained = [componentItem];
                } else {
                    parent.contained.push(componentItem);
                }
            } else {
                this.roots.push(componentItem);
            }
            try {
                result = comp(props!);
            } finally {
                componentItem.result = Array.isArray(result) ? result : [result];
                result = this.wrapComponentResult(result);
                this.componentStack.pop();
            }
            return result!;
        };
        wrapper.componentName = comp.name;
        return wrapper;
    }

    wrapComponentResult(result: ComponentResult): ComponentResult {
        if (Array.isArray(result)) {
            return result.map(r => this.wrapComponentResult(r));
        } else if (typeof result === 'function') {
            return this.wrapComponent(result);
        } else {
            return result;
        }
    }
}

installHook(window, new HookImpl());
