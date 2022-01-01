
export interface Message {
    kind: string;
}

export interface Transport {
    subscribe(fn: (message: Message) => void): () => void;
    send(message: Message): void;
}

export type SerializedPrimitive = {t: 'primitive'; v: unknown};
export type SerializedDate = {t: 'date'; v: number};
export type SerializedFunction = {t: 'function'; name?: string};
export type SerializedArray = {t: 'array'; v: SerializedValue[]};
export type SerializedObject = {t: 'object'; v: Record<string, SerializedValue>};
export type SerializedCircular = {t: 'circular'; v: string};
export type SerializedGetter = {t: 'getter'};

export type SerializedValue =
    | SerializedPrimitive
    | SerializedDate
    | SerializedFunction
    | SerializedArray
    | SerializedObject
    | SerializedCircular
    | SerializedGetter
;
