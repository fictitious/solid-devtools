
import {createResource, Show} from 'solid-js';
import {createStore} from 'solid-js/store';

import type {Options} from './options-types';
import {loadOptions, saveOptions} from './options';

function OptionsUI() {
    const [options] = createResource(loadOptions);
    return <Show when={!options.loading} fallback="Loading..."><OptionsForm options={options() || {}} /></Show>
    ;
}

function OptionsForm(props: {options: Options}) {
    const [options, setOptions] = createStore(props.options);

    const setOption = (optionName: keyof Options, e: Event & {currentTarget: HTMLInputElement}) => {
        const value = e.currentTarget.checked;
        setOptions(optionName, value);
        void saveOptions({[optionName]: value});
    };

    const isOptionDisabled = (optionName: keyof Options): boolean => {
        if (optionName === 'logAllMessages') {
            return !options.showLogPanel;
        } else {
            return false;
        }
    };

    const optionsCheckbox = (optionName: keyof Options, optionTitle: string) => <label style="display: block; padding-top: 0.5em;">
        <input type="checkbox" checked={options[optionName]} onchange={[setOption, optionName]} disabled={isOptionDisabled(optionName)} style="vertical-align: middle"/>
        <span style="vertical-align: middle">{optionTitle}</span>
    </label>;

    return <form>
        <fieldset style="border: none">
            <legend style="font-size: medium">Internal debugging options</legend>
            {optionsCheckbox('exposeIds', `Expose internal ids`)}
            {optionsCheckbox('showLogPanel', `Show internal debug log panel`)}
            {optionsCheckbox('logAllMessages', `Log all messages from page`)}
        </fieldset>
    </form>
    ;
}

export {OptionsUI};
