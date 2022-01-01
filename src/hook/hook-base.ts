
import type {Component} from 'solid-js';

import type {SolidInstance} from './registry/node-component-types';
import type {HookMessageSolidRegistered} from './hook-message-types';
import type {ChannelMessageFromDevtools, Hello, HelloAnswer} from '../channel/channel-message-types';
import {messageFromPage} from '../channel/channel-message-types';
import {globalHookName} from './hook-name';

export type HookComponentWrapper = (c: Component) => Component;
export type HookInsertParentWrapper = (p: Node) => {};
export type HookRegisterRoot = (r: Node) => () => void;

export interface Hook {
    solidInstance?: SolidInstance;
    registerSolidInstance(solidInstance: SolidInstance): void;
    connectChannel(m: Hello): HelloAnswer;
    getComponentWrapper(updateWrapper: (newWrapper: HookComponentWrapper) => void): HookComponentWrapper;
    getInsertParentWrapper(updateWrapper: (newWrapper: HookInsertParentWrapper) => void): HookInsertParentWrapper;
    getRegisterRoot(updateRegisterRoot: (newRegisterRoot: HookRegisterRoot) => void): HookRegisterRoot;
}

// 'stub' hook implementation to inject into the page when solid devtools panel is not open
class HookBaseImpl implements Hook {

    solidInstance: SolidInstance | undefined;

    registerSolidInstance(solidInstance: SolidInstance): void {
        if (this.solidInstance) {
            console.error(`There are multiple instances of Solid trying to register with devtools. This is not supported.`);

        } else {
            this.solidInstance = solidInstance;
            const message: HookMessageSolidRegistered = {category: 'solid-devtools-hook', kind: 'solid-registered', buildType: solidInstance.buildType};
            window.postMessage(message, '*');
        }
    }

    connectChannel(_: Hello): HelloAnswer {
        return {
            hookType: 'stub',
            hookInstanceId: ''
        };
    }

    getComponentWrapper(_updateWrapper: (newWrapper: HookComponentWrapper) => void): HookComponentWrapper {
        return c => c;
    }

    getInsertParentWrapper(_updateWrapper: (newWrapper: HookInsertParentWrapper) => void): HookInsertParentWrapper {
        return p => p;
    }

    getRegisterRoot(_updateRegisterRoot: (newRegisterRoot: HookRegisterRoot) => void): HookRegisterRoot {
        return () => () => {};
    }
}

function installHook(target: {}, hook: Hook): void {
    if (target.hasOwnProperty(globalHookName)) {
        return undefined;
    }
    Object.defineProperty(target, globalHookName, {
        enumerable: false,
        get() { return hook }
    });
    window.addEventListener('message', onHelloMessage);

    function onHelloMessage(e: MessageEvent<ChannelMessageFromDevtools>) {
        if (e.source === window && e.data?.category === 'solid-devtools-channel' && e.data?.kind === 'hello') {
            const helloAnswer = hook.connectChannel(e.data);
            window.postMessage(messageFromPage('helloAnswer', helloAnswer));
        }
    }
}

export {HookBaseImpl, installHook};
