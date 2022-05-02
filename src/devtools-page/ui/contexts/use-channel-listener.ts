
import {useContext, onMount, onCleanup} from 'solid-js';

import type {FromPage, ChannelMessageFromPageMap} from '../../../channel/channel-message-types';
import {ChannelContext} from './channel-context';

function useChannelListener<K extends keyof FromPage>(k: K, listener: (msg: ChannelMessageFromPageMap[K]) => void): void {
    const channel = useContext(ChannelContext);
    onMount(() => channel?.addListener(k, listener));
    onCleanup(() => channel?.removeListener(k, listener));
}

export {useChannelListener};
