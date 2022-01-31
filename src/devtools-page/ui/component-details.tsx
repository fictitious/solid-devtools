
import type {Component} from 'solid-js';
import {Show, useContext} from 'solid-js';

import type {SerializedValue} from '../../channel/channel-transport-types';
import {ChannelContext} from './channel-context';
import {SelectedComponentContext} from './selected-component-context';
import {buttonClass} from './common-styles';

const toolbarButtonClass = `${buttonClass} mx-3 flex-none`;

interface ComponentPropsProps {
    level: number;
    props: SerializedValue;
}

const ComponentProps: Component<ComponentPropsProps> = () => {
    return 'props';
};

const ComponentDetails: Component = () => {

    const channel = useContext(ChannelContext);
    const {selectedComponent} = useContext(SelectedComponentContext)!;
    const debugClick = (componentId: string) => channel?.send('debugBreak', {componentId});

    return <div class="h-full w-full flex flex-col">
        <div class="w-full flex-none flex flex-row py-1 text-xs">
            <Show when={selectedComponent()}>{component => <>
                <div class="py-0.5 mx-3 px-3 w-16 flex-auto text-solid-light text-ellipsis overflow-hidden">{component.name}</div>
                <button onclick={[debugClick, component.id]} class={toolbarButtonClass}>debugger</button>
            </>}</Show>
        </div>
        <div class="flex-auto w-full overflow-auto text-xs leading-snug">
            <Show when={selectedComponent()}>{component => <ComponentProps {...{props: component.props, level: 0}} />}</Show>
        </div>
    </div>
    ;
};

export {ComponentDetails};
