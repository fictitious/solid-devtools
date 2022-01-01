
import type {Registry, NodeExtra} from './registry-types';
import {solidDevtoolsKey} from './registry-types';

function findOrRegisterAncestorOrSelf(
    node: Node & NodeExtra,
    registry: Registry,
    findSiblings?: {prev?: Node & Required<NodeExtra> | undefined; next?: Node & Required<NodeExtra> | undefined}
): Node & Required<NodeExtra> {
    let result: Node & NodeExtra | null = node;
    let lastParent: Node & NodeExtra | null = null;
    while (result && !result[solidDevtoolsKey]) {
        lastParent = result;
        if (findSiblings) {
            findSiblings.prev = findSiblings.prev ?? findRegisteredPrevSiblingOrSelf(result.previousSibling);
            findSiblings.next = findSiblings.next ?? findRegisteredNextSiblingOrSelf(result.nextSibling);
        }
        result = result.parentNode;
    }
    if (result?.[solidDevtoolsKey]) {
        return result as Node & Required<NodeExtra>;
    } else { // result is null, and lastParent is not null and not registered
        return registry.registerDomNode(lastParent!);
    }
}

function findRegisteredDescendantsOrSelf(node: Node & NodeExtra): (Node & Required<NodeExtra>)[] {
    if (node[solidDevtoolsKey]) {
        return [node as Node & Required<NodeExtra>];
    } else {
        return Array.prototype.flatMap.call(node.childNodes, findRegisteredDescendantsOrSelf) as (Node & Required<NodeExtra>)[];
    }
}

function findRegisteredPrevSiblingOrSelf(node: Node & NodeExtra | null): Node & Required<NodeExtra> | undefined {
    let result: Node & Required<NodeExtra> | undefined;
    let np = node;
    while (np && !result) {
        const npd = findRegisteredDescendantsOrSelf(np);
        if (npd.length) {
            result = npd[npd.length - 1];
        }
        np = np.previousSibling;
    }
    return result;
}

function findRegisteredNextSiblingOrSelf(node: Node & NodeExtra | null): Node & Required<NodeExtra> | undefined {
    let result: Node & Required<NodeExtra> | undefined;
    let nn = node;
    while (nn && !result) {
        const nnd = findRegisteredDescendantsOrSelf(nn);
        if (nnd.length) {
            result = nnd[0];
        }
        nn = nn.nextSibling;
    }

    return result;
}

export {solidDevtoolsKey, findOrRegisterAncestorOrSelf, findRegisteredDescendantsOrSelf, findRegisteredPrevSiblingOrSelf, findRegisteredNextSiblingOrSelf};
