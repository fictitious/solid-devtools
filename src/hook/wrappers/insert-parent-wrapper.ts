

import type {Channel} from '../../channel/channel-message-types';
import type {Registry, NodeExtra} from './registry';
import {solidDevtoolsKey} from './registry';

// intercept and transmit to devtools all operations
// performed on parent in insertExpression() in the dom-expressions src/client.js
class InsertParentWrapperImpl {

    constructor(
        public parent: Node,
        public registry: Registry,
        public channel: Channel<'page'>
    ) {
    }

    get firstChild(): Node | null { return this.parent.firstChild }

    get textContent(): string | null { return this.parent.textContent }
    set textContent(content: string | null) {
        Array.prototype.forEach.call(this.parent.childNodes, (n: Node) => this.nodeRemoved(n));
        this.parent.textContent = content;
    }

    appendChild(child: Node & NodeExtra): void {
        const childIds = findRegisteredDescendantsOrSelf(child).map(c => c[solidDevtoolsKey].id);
        if (childIds.length) {
            const rp = findOrRegisterAncestorOrSelf(this.parent, this.registry);
            this.channel.send('domNodeAppended', {parentId: rp[solidDevtoolsKey].id, childIds});
        }
        this.parent.appendChild(child);
    }

    removeChild(child: Node & NodeExtra): void {
        this.nodeRemoved(child);
        this.parent.removeChild(child);
    }

    insertBefore(child: Node & NodeExtra, before: Node & NodeExtra | null): void {
        const childIds = findRegisteredDescendantsOrSelf(child).map(c => c[solidDevtoolsKey].id);
        if (childIds.length) {
            const findSiblings = before ? {
                prev: findRegisteredPrevSiblingOrSelf(before.previousSibling),
                next: findRegisteredNextSiblingOrSelf(before)
            } : undefined;

            const rp = findOrRegisterAncestorOrSelf(this.parent, this.registry, findSiblings);
            if (!before) {
                this.channel.send('domNodeAppended', {parentId: rp[solidDevtoolsKey].id, childIds});
            } else {
                this.channel.send('domNodeInserted', {
                    parentId: rp[solidDevtoolsKey].id,
                    childIds,
                    prevId: findSiblings?.prev?.[solidDevtoolsKey].id,
                    nextId: findSiblings?.next?.[solidDevtoolsKey].id
                });
            }
        }
        this.parent.insertBefore(child, before);
    }

    replaceChild(newChild: Node & NodeExtra, oldChild: Node & NodeExtra): void {
        const childIds = findRegisteredDescendantsOrSelf(newChild).map(c => c[solidDevtoolsKey].id);
        const findSiblings = childIds.length ? {
            prev: findRegisteredPrevSiblingOrSelf(oldChild.previousSibling),
            next: findRegisteredNextSiblingOrSelf(oldChild.nextSibling)
        } : undefined;

        this.nodeRemoved(oldChild);
        if (childIds.length) {
            const rp = findOrRegisterAncestorOrSelf(this.parent, this.registry, findSiblings);
            this.channel.send('domNodeInserted', {
                parentId: rp[solidDevtoolsKey].id,
                childIds,
                prevId: findSiblings?.prev?.[solidDevtoolsKey].id,
                nextId: findSiblings?.next?.[solidDevtoolsKey].id
            });
        }
        this.parent.replaceChild(newChild, oldChild);
    }

    nodeRemoved(node: Node & NodeExtra) {
        const rc = findRegisteredDescendantsOrSelf(node);
        for (const e of rc) {
            this.channel.send('domNodeRemoved', {id: e[solidDevtoolsKey].id});
        }
        unregisterDomNode(node, this.registry);
    }
}

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
            findSiblings.prev = findSiblings.prev ?? findRegisteredPrevSiblingOrSelf(result);
            findSiblings.next = findSiblings.next ?? findRegisteredNextSiblingOrSelf(result);
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

function unregisterDomNode(node: Node & NodeExtra, registry: Registry) {
    registry.unregisterDomNode(node);
    let c = node.firstChild;
    while (c) {
        unregisterDomNode(c, registry);
        c = c.nextSibling;
    }
}

function createInsertParentWrapper(parent: Node, registry: Registry, channel: Channel<'page'>): {} {
    return parent instanceof InsertParentWrapperImpl ? parent : new InsertParentWrapperImpl(parent, registry, channel);
}

export {createInsertParentWrapper};
