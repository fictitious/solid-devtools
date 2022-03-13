
import type {Component} from 'solid-js';
import {Show, useContext} from 'solid-js';

import {ChannelContext} from './contexts/channel-context';
import {OptionsContext} from './contexts/options-context';
import {SelectedComponentContext} from './contexts/selected-component-context';
import {ValueList} from './value-list';
import {buttonClass} from './common-styles';

const toolbarButtonClass = `${buttonClass} mx-3 flex-none`;

const ComponentDetails: Component = () => {

    const options = useContext(OptionsContext);
    const channel = useContext(ChannelContext);
    const {selectedComponent} = useContext(SelectedComponentContext)!;
    const debugClick = (componentId: string) => channel?.send('debugBreak', {componentId});

    return <div class="h-full w-full flex flex-col">
        <div class="w-full flex-none flex flex-row py-1 text-xs">
            <Show when={selectedComponent()}>{component => <>
                <div class="py-0.5 mx-3 px-3 w-16 flex-auto text-solid-light text-ellipsis overflow-hidden cursor-default">{component.name}</div>
                <Show when={options?.exposeDebuggerHack}><button onclick={[debugClick, component.id]} class={toolbarButtonClass}>debugger</button></Show>
            </>}</Show>
        </div>
        <div class="flex-auto w-full overflow-auto text-xs leading-snug">
            <Show when={selectedComponent()}>
                {component => <ValueList values={component.props} />}
            </Show>
        </div>
    </div>
    ;
};

export {ComponentDetails};
