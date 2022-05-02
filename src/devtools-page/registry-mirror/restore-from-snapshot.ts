
import type {ComponentItemResult} from '../../hook/registry/node-component-types';
import type {RegistrySnapshotMessageWithKind} from '../../channel/channel-message-types';
import type {RegistryMirror} from './registry-mirror-types';

// this relies on particular order of snapshot messages: first, all nodes, then all components, then all domNodeAppended
function restoreMirrorFromSnapshot(registryMirror: RegistryMirror, message: Exclude<RegistrySnapshotMessageWithKind, {kind: 'snapshotCompleted'}>): void {
    if (message.kind === 'snapshotDomNode') {
        registryMirror.domNodeRegistered(message);
        if (message.isRoot) {
            registryMirror.domNodeIsRoot(message);
        }

    } else if (message.kind === 'snapshotComponent') {
        registryMirror.componentRendered(message);
        restoreComponentResult(registryMirror, message.id, message.result, []);

    } else if (message.kind === 'snapshotDomNodeAppended') {
        registryMirror.domNodeAppended(message);

    }  else if (message.kind === 'snapshotSignal') {
        registryMirror.signalCreated(message);
    }

}

function restoreComponentResult(registryMirror: RegistryMirror, componentId: string, result: ComponentItemResult[], index: number[]): void {
    for (const [i, r] of result.entries()) {
        const currentIndex = [...index, i];
        if (Array.isArray(r)) {
            restoreComponentResult(registryMirror, componentId, r, currentIndex);
        } else if (r) {
            registryMirror.domNodeAddedResultOf({id: r, resultOf: componentId, index: currentIndex});
        }
    }
}

export {restoreMirrorFromSnapshot};
