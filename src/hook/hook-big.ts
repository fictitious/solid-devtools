// script to inject into the page when solid devtools panel is open

import type {HookBig} from './hook-types';
import {HookBaseImpl, installHook} from './hook-base';

class HookBigImpl extends HookBaseImpl implements HookBig {

    hookType = 'big' as const;

}

installHook(window, new HookBigImpl());
