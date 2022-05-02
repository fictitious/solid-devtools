
//import {devtoolsHookName} from 'solid-js';
import type {RegisterSolidInstance as SolidInstance, ComponentWrapper, HookInsertParentWrapper, HookRegisterDOMRoot, HookRegisterComputation, HookWrapSignal} from 'solid-js';

import type {HookMessageSolidRegistered} from './hook-message-types';
import type {ChannelMessageFromDevtools, Hello, HelloAnswer} from '../channel/channel-message-types';
import {messageFromPage} from '../channel/channel-message-types';
import type {ChunkResult} from './chunk/chunk-types';
import type {Hook} from './hook-types';

const devtoolsHookName = '__SOLID_DEVTOOLS_GLOBAL_HOOK__';

// 'stub' hook implementation to inject into the page when solid devtools panel is not open
class HookBaseImpl implements Hook {

    solidInstance: SolidInstance | undefined;
    chunkResult: Promise<ChunkResult>;
    resovleChunkResult!: (chunkResult: ChunkResult) => void;

    constructor() {
        this.chunkResult = new Promise<ChunkResult>(resolve => {
            this.resovleChunkResult = resolve;
        });
    }

    isActive() {
        return false;
    }

    registerSolidInstance(solidInstance: SolidInstance): void {
        if (this.solidInstance) {
            console.error(`There are multiple instances of Solid trying to register with devtools. This is not supported.`);

        } else {
            this.solidInstance = solidInstance;
            const message: HookMessageSolidRegistered = {category: 'solid-devtools-hook', kind: 'solid-registered', buildType: solidInstance.buildType};
            window.postMessage(message, '*');
        }
    }

    connectChannel(_: Hello, sendAnswer: (answer: HelloAnswer) => void): void {
        sendAnswer({
            hookType: 'stub',
            hookInstanceId: ''
        });
    }

    getComponentWrapper(_updateWrapper: (newWrapper: ComponentWrapper) => void): ComponentWrapper {
        return c => c;
    }

    getInsertParentWrapper(_updateWrapper: (newWrapper: HookInsertParentWrapper) => void): HookInsertParentWrapper {
        return p => p;
    }

    getRegisterDOMRoot(_updateRegisterDOMRoot: (newRegisterDOMRoot: HookRegisterDOMRoot) => void): HookRegisterDOMRoot {
        return () => () => {};
    }

    getRegisterComputation(_updateRegister: (newRegister: HookRegisterComputation) => void): HookRegisterComputation {
        return () => {};
    }

    getWrapSignal(_updateWrap: (newWrap: HookWrapSignal) => void): HookWrapSignal {
        return setter => setter;
    }
}

function installHook(target: {}, hook: Hook): void {
    if (target.hasOwnProperty(devtoolsHookName)) {
        return undefined;
    }
    Object.defineProperty(target, devtoolsHookName, {
        enumerable: false,
        get() { return hook }
    });
    window.addEventListener('message', onHelloMessage);

    function onHelloMessage(e: MessageEvent<ChannelMessageFromDevtools>) {
        if (e.source === window && e.data?.category === 'solid-devtools-channel' && e.data?.kind === 'hello') {
            hook.connectChannel(e.data, helloAnswer => window.postMessage(messageFromPage('helloAnswer', helloAnswer)));
        }
    }
}

export {HookBaseImpl, installHook};
