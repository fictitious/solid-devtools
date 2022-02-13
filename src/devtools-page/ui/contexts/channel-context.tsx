
import {createContext} from 'solid-js';

import type {Channel} from '../../../channel/channel-types';

const ChannelContext = createContext<Channel<'devtools'>>();

export {ChannelContext};

