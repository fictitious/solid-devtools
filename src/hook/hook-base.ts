
import type {Hook, SolidInstance, ComponentWrapper} from './hook-types';
import type {HookMessageSolidRegistered} from './hook-message-types';
import {globalHookName} from './hook-name';

let uidCounter = 0;

class HookBaseImpl implements Hook {

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

function installHook(target: {}, hook: Hook): void {
    if (target.hasOwnProperty(globalHookName)) {
        return undefined;
    }
    Object.defineProperty(target, globalHookName, {
        enumerable: false,
        get() { return hook }
    });
}

export {HookBaseImpl, installHook};
