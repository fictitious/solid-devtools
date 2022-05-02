
import type {Setter} from 'solid-js';

import type {SerializedValue} from '../../channel/channel-transport-types';

import type {SignalData} from './signal-data-types';

interface AddSignal {
    setSignals: Setter<SignalData[]>;
    signalId: string;
    name?: string;
    value: SerializedValue;
}
function addSignal({setSignals, signalId, name, value}: AddSignal): void {
    setSignals(signals => [...signals, {id: signalId, name, value}]);
}

function updateSignal(setSignals: Setter<SignalData[]>, signalId: string, value: SerializedValue): void {
    setSignals(signals => signals.map(s => s.id === signalId ? {...s, value} : s));
}

function removeSignal(setSignals: Setter<SignalData[]>, signalId: string): void {
    setSignals(signals => signals.filter(s => s.id !== signalId));
}

export {addSignal, updateSignal, removeSignal};
