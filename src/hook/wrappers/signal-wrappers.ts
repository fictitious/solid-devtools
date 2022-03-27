
import type {Setter, SignalState, Computation, RegisterSolidInstance as SolidInstance} from 'solid-js';

import type {Registry} from '../registry/registry-types';

function registerComputation<T>(c: Computation<T>): void {
    if (c.owner && c.owner.devtoolsData) {
        if (!c.devtoolsData) {
            c.devtoolsData = {type: 'intermediate'};
        }
        const ownerData = c.owner.devtoolsData;
        c.devtoolsData.upper = ownerData.type === 'intermediate' ? ownerData.upper : ownerData;
    }
}

interface WrapSignal<T> {
    setter: Setter<T | undefined>;
    signalState: SignalState<T>;
    name: string | undefined;
    solidInstance: SolidInstance | undefined;
    registry: Registry;
}
function wrapSignal<T>({setter, signalState, name, solidInstance, registry}: WrapSignal<T>): Setter<T | undefined> {
    const owner = solidInstance?.getOwner();
    const ownerData = owner?.devtoolsData;
    let wrappedSetter = setter;
    if (ownerData) {
        const ownerId = ownerData.type === 'intermediate' ? ownerData.upper?.id : ownerData.id;
        let signalId: string;
        if (ownerId) {
            wrappedSetter = ((value: (T extends Function ? never : T) | ((prev?: T) => T | undefined)) => {
                const newValue = setter(value);
                registry.updateSignal(signalId, newValue);
                return newValue;
            }) as Setter<T | undefined>;

            signalId = registry.registerSignal(ownerId, wrappedSetter as Setter<unknown>, name, signalState.value);

            if (!ownerData.ownedSignalIds) {
                solidInstance!.onCleanup(() => cleanupSignals(owner.devtoolsData, registry));
                ownerData.ownedSignalIds = [signalId];
            } else {
                ownerData.ownedSignalIds.push(signalId);
            }
        }
    }
    return wrappedSetter;
}

function cleanupSignals(ownerData: {ownedSignalIds?: string[]} | undefined, registry: Registry): void {
    if (ownerData && ownerData.ownedSignalIds) {
        for (const signalId of ownerData.ownedSignalIds) {
            registry.unregisterSignal(signalId);
        }
        delete ownerData.ownedSignalIds;
    }
}

export {registerComputation, wrapSignal};
