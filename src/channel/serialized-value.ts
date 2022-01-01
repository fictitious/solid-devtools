
import type {SerializedValue} from './channel-transport-types';

function serializeValue(v: unknown, path = '', seen: Map<unknown, string> = new Map()): SerializedValue {
    let result: SerializedValue;
    const s = seen.get(v);
    if (s !== undefined) {
        result = {t: 'circular', v: s};
    } else if (!v || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        result =  {t: 'primitive', v};
    } else if (v instanceof Date) {
        result = {t: 'date', v: v.getTime()};
    } else if (typeof v === 'function') {
        result = {t: 'function', name: v.name};
    } else if (Array.isArray(v)) {
        seen.set(v, path);
        result = {t: 'array', v: v.map((o, i) => serializeValue(o, `${path}[${i}]`, seen))};
    } else if (typeof v === 'object') {
        seen.set(v, path);
        result = {t: 'object', v: {}};
        for (const k of Object.keys(v as {})) {
            if (typeof Object.getOwnPropertyDescriptor(v, k)?.get === 'function') {
                // do not call getters because for example accessing children will call createComponent() for child components
                result.v[k] = {t: 'getter'};
            } else {
                result.v[k] = serializeValue((v as Record<string, unknown>)[k], `${path}.${k}`, seen);
            }
        }
    } else {
        console.error(`serializeValue: unknown value type. value:`, v);
        seen.set(v, path);
        result = {t: 'object', v: {}};
    }
    return result;
}

export {serializeValue};
