
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

export {getComponentResultIds};
