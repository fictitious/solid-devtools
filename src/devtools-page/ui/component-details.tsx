
import type {Component, Accessor} from 'solid-js';
import {Show} from 'solid-js';

import type {SignalData} from '../data/signal-data-types';
import {selectedComponent, selectedGlobalSignals} from './contexts/tree-selection-context';
import {PropsList, SignalList} from './value-list';

const headerTextClass = 'py-0.5 mx-3 px-3 text-solid-light text-ellipsis overflow-hidden cursor-default';

const ComponentSignals: Component<{getSignals: Accessor<SignalData[]>}> = props => {
    const when = () => {
        const signals = props.getSignals();
        return signals.length ? signals : undefined;
    };
    return <Show when={when()}>{signals => <>
        <div class={`w-full ${headerTextClass}`}>signals</div>
        <SignalList signals={signals} />
    </>}</Show>
    ;
};

const ComponentDetails: Component = () => {

    return <div class="h-full w-full flex flex-col">

        <div class="w-full flex-none flex flex-row py-1 text-xs">
            <Show when={selectedComponent()}>{component => <>
                <div class={`w-16 flex-auto ${headerTextClass}`}>{component.name}</div>
            </>}</Show>
        </div>

        <div class="flex-auto w-full overflow-auto text-xs leading-snug">

            <Show when={selectedComponent()}>{component => <>
                <PropsList values={component.props} />
                <ComponentSignals getSignals={component.getSignals} />
            </>}</Show>

            <Show when={selectedGlobalSignals()}>{globalSignals =>
                <SignalList signals={globalSignals()}></SignalList>
            }</Show>

        </div>

    </div>
    ;
};

export {ComponentDetails};
