// script to inject into the page when solid devtools panel is not open

import {installHook, HookBaseImpl} from './hook-base';


installHook(window, new HookBaseImpl());
