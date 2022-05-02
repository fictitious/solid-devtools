
import type {SerializedValue} from '../../channel/channel-transport-types';

export interface SignalData {
    id: string;
    name?: string;
    value: SerializedValue;
}

