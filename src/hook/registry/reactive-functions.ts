
import type {Owner, DevtoolsData} from 'solid-js';

function getOwnerDevtoolsData(owner: Owner | null | undefined): DevtoolsData | undefined {
    // really, there should be something like wrapReactiveRoot hook for solid createRoot()
    // instead of this workaround here
    return owner ? owner.devtoolsData ?? owner.owner?.devtoolsData : undefined;
}

export {getOwnerDevtoolsData};
