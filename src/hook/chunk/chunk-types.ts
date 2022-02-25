
import type {highlightComponent, stopHighlightComponent} from '../highlighter/highlighter';
import type {startInspecting, stopInspecting} from '../highlighter/inspect-element';
import type {createChannel} from '../../channel/channel';

// manual code splitting to make the initally loaded hook script as small as possible

export interface ChunkResult {
    highlightComponent: typeof highlightComponent;
    stopHighlightComponent: typeof stopHighlightComponent;
    startInspecting: typeof startInspecting;
    stopInspecting: typeof stopInspecting;
    createChannel: typeof createChannel;
}
