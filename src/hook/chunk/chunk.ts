
import type {Hook} from '../hook-types';
import {highlightComponent, stopHighlightComponent} from '../highlighter/highlighter';
import {startInspecting, stopInspecting} from '../highlighter/inspect-element';
import {createChannel} from '../../channel/channel';

const devtoolsHookName = '__SOLID_DEVTOOLS_GLOBAL_HOOK__';

(window[devtoolsHookName] as Hook)?.resovleChunkResult({createChannel, highlightComponent, stopHighlightComponent, startInspecting, stopInspecting});
