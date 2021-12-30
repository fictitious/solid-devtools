
import type {SolidInstance} from './registry/types';
import type {HookType, HookBase, HookComponentWrapper, HookInsertParentWrapper, HookRegisterRoot} from './hook-types';
import type {HookMessageSolidRegistered} from './hook-message-types';
import type {Channel, ChannelMessageFromDevtools} from '../channel/channel-message-types';
import {messageFromPage} from '../channel/channel-message-types';
import {globalHookName} from './hook-name';

abstract class HookBaseImpl implements HookBase {

    abstract hookType: 'full' | 'stub';
    abstract channel: Channel<'page'>;
    deactivated?: boolean;
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

    connectChannel(): void {
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

function installHook(target: {}, hook: HookBase): void {
    if (target.hasOwnProperty(globalHookName)) {
        return undefined;
    }
    Object.defineProperty(target, globalHookName, {
        enumerable: false,
        get() { return hook }
    });
    window.addEventListener('message', onHelloMessage(hook.hookType));

    function onHelloMessage(hookType: HookType) {
        return handler;
        function handler(e: MessageEvent<ChannelMessageFromDevtools>) {
            if (e.source === window && e.data?.category === 'solid-devtools-channel' && e.data?.kind === 'hello') {
                window.postMessage(messageFromPage('helloAnswer', {hookType, deactivated: hook.deactivated}), '*');
                hook.connectChannel();
            }
        }
    }
}

export {HookBaseImpl, installHook};
