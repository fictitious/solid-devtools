// based on events.js from React Devtools

import type {Listener, EventEmitter} from './event-emitter-types';

class EventEmitterImpl implements EventEmitter {

    listenersMap: Map<string, Listener[]>;

    constructor() {
        this.listenersMap = new Map();
    }

    addListener(kind: string, listener: Listener): void {
        const listeners = this.listenersMap.get(kind);
        if (listeners === undefined) {
            this.listenersMap.set(kind, [listener]);
        } else {
            listenerListAdd(listeners, listener);
        }
    }

    removeListener(kind: string, listener: Listener): void {
        const listeners = this.listenersMap.get(kind);
        if (listeners) {
            listenerListRemove(listeners, listener);
        }
    }

    removeAllListeners(): void {
        this.listenersMap.clear();
    }

    emit(msg: {kind: string}): void {
        const listeners = this.listenersMap.get(msg.kind);
        if (listeners) {
            listenerListEmit(listeners, msg);
        }
    }
}

function listenerListAdd(listenerList: Listener[], listener: Listener): void {
    if (listenerList.indexOf(listener) < 0) {
        listenerList.push(listener);
    }
}

function listenerListRemove(listenerList: Listener[], listener: Listener): void {
    const index = listenerList.indexOf(listener);
    if (index >= 0) {
        listenerList.splice(index, 1);
    }
}

function listenerListEmit(listenerList: Listener[], msg: {}): void {
    if (listenerList.length === 1) {
        listenerList[0](msg);
    } else {
        let error: unknown;
        Array.from(listenerList).forEach(listener => {
            try {
                listener(msg);
            } catch (e) {
                if (error === undefined) {
                    error = e;
                }
            }
        });
        if (error) {
            throw error;
        }
    }
}

export {EventEmitterImpl, listenerListAdd, listenerListRemove, listenerListEmit};
