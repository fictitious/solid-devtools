import type {HookMessageSolidRegistered} from './hook-message-types';

export interface SolidInstance { // 'renderer' in react devtools
    buildType: 'development' | 'production';
}

export interface SolidRegistered {
    solidInstance: SolidInstance;
    id: number;
}

export interface EventPayloadMap {
    'solid-registered': SolidRegistered;
}
export type Events = keyof EventPayloadMap;

export type Listener<E extends Events> = (payload: EventPayloadMap[E]) => void;
export type Listeners = {[E in Events]?: Listener<E>[]};

export interface Hook {
    solidInstances: Map<number, SolidInstance>;
    listeners: Listeners;

    registerSolidInstance(solidInstance: SolidInstance): void;
/*

    emit<E extends Events>(event: E, payload: EventPayloadMap[E]): void;
    on<E extends Events>(event: E, listener: Listener<E>): void;
    off<E extends Events>(event: E, listener: Listener<E>): void;
    sub<E extends Events>(event: E, listener: Listener<E>): () => void;
*/
}

export const theHookName = '__SOLID_DEVTOOLS_GLOBAL_HOOK__';

function installHook(target: {}): Hook | undefined {
    if (target.hasOwnProperty(theHookName)) {
        return undefined;
    }

    let uidCounter = 0;

    const hook: Hook = {
        listeners: {},
        solidInstances: new Map<number, SolidInstance>(),

        registerSolidInstance(solidInstance: SolidInstance): number {
            const id = ++uidCounter;
            this.solidInstances.set(id, solidInstance);
            const message: HookMessageSolidRegistered = {category: 'solid-devtools-hook', kind: 'solid-registered', buildType: solidInstance.buildType};
            window.postMessage(message, '*');

            console.log(`posted window message`, message);
//            this.emit('solid-registered', {solidInstance, id});
            return id;
        }//,
/*
        emit<E extends Events>(event: E, payload: EventPayloadMap[E]): void {
            const listeners = this.listeners[event] as Listener<E>[] | undefined;
            listeners && listeners.forEach(listener => listener(payload));
        },

        on<E extends Events>(event: E, listener: Listener<E>): void {
            let listeners = this.listeners[event] as Listener<E>[] | undefined;
            if (!listeners) {
                listeners = this.listeners[event] = [];
            }
            listeners.push(listener);
        },

        off<E extends Events>(event: E, listener: Listener<E>): void {
            const listeners = this.listeners[event] as Listener<E>[] | undefined;
            if (listeners) {
                const index = listeners.indexOf(listener);
                if (index !== -1) {
                    listeners.splice(index, 1);
                }
                if (!listeners.length) {
                    delete this.listeners[event];
                }
            }
        },

        sub<E extends Events>(event: E, listener: Listener<E>): () => void {
            this.on(event, listener);
            return () => this.off(event, listener);
        }
*/
    };
    Object.defineProperty(target, theHookName, {
        enumerable: false,
        get() { return hook }
    });
}

installHook(window);
