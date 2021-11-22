// script to inject into the page when solid devtools panel is not open

import type {HookSmall} from './hook-types';
import {installHook, HookBaseImpl} from './hook-base';

class HookSmallImpl extends HookBaseImpl implements HookSmall {
    hookType = 'small' as const;
}

installHook(window, new HookSmallImpl());
