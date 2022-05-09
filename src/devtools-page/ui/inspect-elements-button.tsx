
import type {Setter} from 'solid-js';
import {createSignal, useContext} from 'solid-js';

import type {Channel} from '../../channel/channel-types';
import {ChannelContext} from './contexts/channel-context';
import {useChannelListener} from './contexts/use-channel-listener';
import svgInspectElementOnPage from './assets/inspect-element-on-page.svg';

function InspectElementsButton() {
    const [inspectingElements, setInspectingElements] = createSignal(false);
    const toggleInspectingElements = toggleInspectingElementHandler(setInspectingElements, useContext(ChannelContext));
    useChannelListener('inspectComponentEnded', () => setInspectingElements(false));

    return <div classList={{
        'py-0.5 mx-3 text-slate-600': true,
        'hover:text-slate-900': !inspectingElements(),
        'text-sky-400': inspectingElements()
    }}>
        <svg onclick={toggleInspectingElements} class="w-4 h-4"><use href={`${svgInspectElementOnPage}#main`}></use></svg>
    </div>
    ;
}

function toggleInspectingElementHandler(setInspectingElements: Setter<boolean>, channel?: Channel<'devtools'>): () => void {
    return () => setInspectingElements(oldValue => {
        const value = !oldValue;
        channel?.send(value ? 'startInspectingElements' : 'stopInspectingElements', {});
        return value;
    });
}

export {InspectElementsButton};
