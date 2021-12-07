// script to inject into the page when solid devtools panel is not open

import type {Channel} from '../channel/channel-message-types';
import type {HookStub} from './hook-types';
import {installHook, HookBaseImpl} from './hook-base';

class HookStubImpl extends HookBaseImpl implements HookStub {
    channel: Channel<'page'>;
    hookType: 'stub';

    constructor() {
        super();
        this.channel = undefined as unknown as Channel<'page'>;
        this.hookType = 'stub';
    }
}

installHook(window, new HookStubImpl());
