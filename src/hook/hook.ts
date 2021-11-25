// script to inject into the page when solid devtools panel is open

import type {Hook} from './hook-types';
import {HookBaseImpl, installHook} from './hook-base';

class HookImpl extends HookBaseImpl implements Hook {

    hookType = 'full' as const;

}

installHook(window, new HookImpl());
