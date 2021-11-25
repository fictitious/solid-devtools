
import type {HookType, HookBase, SolidInstance, ComponentWrapper} from './hook-types';
import type {HookMessageSolidRegistered} from './hook-message-types';
import type {ConnectorMessageFromDevtools, ConnectorMessageHelloAnswer} from '../connector-message-types';
import {globalHookName} from './hook-name';

let uidCounter = 0;

abstract class HookBaseImpl implements HookBase {

    abstract hookType: 'full' | 'stub';
    solidInstances = new Map<number, SolidInstance>();

    registerSolidInstance(solidInstance: SolidInstance): number {
        const id = ++uidCounter;
        this.solidInstances.set(id, solidInstance);
        const message: HookMessageSolidRegistered = {category: 'solid-devtools-hook', kind: 'solid-registered', buildType: solidInstance.buildType};
        window.postMessage(message, '*');
        return id;
    }

    getComponentWrapper(): ComponentWrapper {
        return c => c;
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
        function handler(e: MessageEvent<ConnectorMessageFromDevtools>) {
            if (e.source === window && e.data?.category === 'solid-devtools-connector' && e.data?.kind === 'hello') {
                const answerMessage: ConnectorMessageHelloAnswer = {category: 'solid-devtools-connector', kind: 'helloAnswer', hookType};
                window.postMessage(answerMessage, '*');
                // init connector in the big hook here ?
//                window.removeEventListener('message', handler);
            }
        }
    }
}

export {HookBaseImpl, installHook};
