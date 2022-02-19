
export type Listener = (arg: unknown) => void;

export interface EventEmitter {
    addListener(kind: string, listener: Listener): void;
    removeListener(kind: string, listener: Listener): void;
    removeAllListeners(): void;
    emit(msg: {kind: string}): void;
}

