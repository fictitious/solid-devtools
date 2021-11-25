import type {Component} from 'solid-js';

import type {ConnectionState} from '../connection-state';

export interface ComponentsPanelProps {
    connectionState: ConnectionState;
}

const ComponentsPanel: Component<ComponentsPanelProps> = props => {
    return <>
        <p>hook type: {props.connectionState.hookType()}</p>
        <p>channel state: {props.connectionState.channelState()}</p>
    </>;
};

export {ComponentsPanel};
