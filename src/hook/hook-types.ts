
import type {RegisterSolidInstance as SolidInstance, HookApi} from 'solid-js';

import type {Hello, HelloAnswer} from '../channel/channel-message-types';
import type {ChunkResult} from './chunk/chunk-types';

export interface Hook extends HookApi {
    solidInstance?: SolidInstance;
    connectChannel(m: Hello, sendAnswer: (answer: HelloAnswer) => void): void;
    chunkResult: Promise<ChunkResult>;
    resovleChunkResult: (chunkResult: ChunkResult) => void;
}
