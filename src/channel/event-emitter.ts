// based on events.js from React Devtools

type Listener = (arg: unknown) => void;

class EventEmitterImpl {

    listenersMap: Map<string, Listener[]>;

    constructor() {
        this.listenersMap = new Map();
    }

    addListener(kind: string, listener: Listener): void {
        const listeners = this.listenersMap.get(kind);
        if (listeners === undefined) {
            this.listenersMap.set(kind, [listener]);
        } else {
            if (listeners.indexOf(listener) < 0) {
                listeners.push(listener);
            }
        }
    }

    removeListener(kind: string, listener: Listener): void {
        const listeners = this.listenersMap.get(kind);
        if (listeners) {
            const index = listeners.indexOf(listener);
            if (index >= 0) {
                listeners.splice(index, 1);
            }
        }
    }

    removeAllListeners() {
        this.listenersMap.clear();
    }

    emit(msg: {kind: string}): void {
        const listeners = this.listenersMap.get(msg.kind);
        if (listeners) {
            if (listeners.length === 1) {
                listeners[0](msg);
            } else {
                let error: unknown;
                Array.from(listeners).forEach(listener => {
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
    }
}

export {EventEmitterImpl};
