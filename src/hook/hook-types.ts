
import type {RegisterSolidInstance as SolidInstance, HookApi} from 'solid-js/devtools-api';

import type {Hello, HelloAnswer} from '../channel/channel-message-types';

export interface Hook extends HookApi {
    solidInstance?: SolidInstance;
    connectChannel(m: Hello): HelloAnswer;
}
