
import {createContext} from 'solid-js';

import type {Channel} from '../../channel/channel-message-types';

const ChannelContext = createContext<Channel<'devtools'>>();

export {ChannelContext};

