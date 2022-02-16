
import type {ComponentItem, ComponentItemResult} from './node-component-types';

function getComponentResultIds(component: ComponentItem): string[] {
    const ids: string[] = [];
    const addResultIds = (result: ComponentItemResult) => {
        if (Array.isArray(result)) {
            result.forEach(addResultIds);
        } else if (result) {
            ids.push(result);
        }
    };
    addResultIds(component.result);
    return ids;
}

const hotPrefix = '_Hot$$';
function removeHotPrefix(name: string): string {
    return name.startsWith(hotPrefix) ? name.substring(hotPrefix.length) : name;
}

export {getComponentResultIds, removeHotPrefix};
