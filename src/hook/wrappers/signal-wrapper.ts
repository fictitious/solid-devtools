
import type {Setter, SignalState, RegisterSolidInstance as SolidInstance} from 'solid-js';

import type {Registry} from '../registry/registry-types';
import {getOwnerDevtoolsData} from '../registry/reactive-functions';

interface WrapSignal<T> {
    setter: Setter<T | undefined>;
    signalState: SignalState<T>;
    name: string | undefined;
    solidInstance: SolidInstance | undefined;
    registry: Registry;
    stack?: string;
}
function wrapSignal<T>({setter, signalState, name, solidInstance, registry, stack}: WrapSignal<T>): Setter<T | undefined> {
    const ownerData = getOwnerDevtoolsData(solidInstance?.getOwner());
    let signalId: string;

    const wrappedSetter = ((value: (T extends Function ? never : T) | ((prev?: T) => T | undefined)) => {
        const newValue = setter(value);
        registry.updateSignal(signalId, newValue);
        return newValue;
    }) as Setter<T | undefined>;

    signalId = registry.registerSignal({ownerId: ownerData?.id, componentId: ownerData?.componentId, setter: wrappedSetter as Setter<unknown>, name, value: signalState.value, stack});
    if (ownerData) {
        const ownedSignalIds = ownerData.ownedSignalIds ?? (ownerData.ownedSignalIds = []);
        ownedSignalIds.push(signalId);
    }
    return wrappedSetter;
}

export {wrapSignal};
