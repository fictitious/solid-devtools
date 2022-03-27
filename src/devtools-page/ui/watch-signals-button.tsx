
import {useContext} from 'solid-js';
import type {Component} from 'solid-js';

import type {ComponentData} from '../data/component-data-types';
import {ChannelContext} from './contexts/channel-context';
import {buttonGeometryClass} from './common-styles';
import svgCheckboxCircleEmpty from './assets/checkbox-circle-empty.svg';
import svgCheckboxCircleChecked from './assets/checkbox-circle-checked.svg';

const WatchSignalsButton: Component<{component: ComponentData}> = ({component}) => {
    const channel = useContext(ChannelContext);
    const onClick = () => {
        component.setWatchingSignals(w => {
            const watching = !w;
            channel!.send('setComponentWatchingSignals', {componentId: component.id, watching});
            return watching;
        });
    };
    const cls = () => `${buttonGeometryClass} hover:bg-blue-300 border-blue-400 ml-1 mt-1 ${component.watchingSignals() ? 'bg-blue-600 text-white' : 'bg-blue-50'}`;
    return <button onClick={onClick} class={cls()}>
        <svg class="w-4 h-4 mr-2 inline-block relative -top-px">
            <use href={`${component.watchingSignals() ? svgCheckboxCircleChecked : svgCheckboxCircleEmpty}#main`}></use>
        </svg>
        Watch signals
    </button>;
};

export {WatchSignalsButton};
