// script to inject into the page when solid devtools panel is not open

import type {HookStub} from './hook-types';
import {installHook, HookBaseImpl} from './hook-base';

class HookStubImpl extends HookBaseImpl implements HookStub {
    hookType = 'stub' as const;
}

installHook(window, new HookStubImpl());
