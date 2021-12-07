

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

    insertBefore(child: Node & NodeExtra, before: Node & NodeExtra): void {
        const childIds = findRegisteredDescendantsOrSelf(child).map(c => c[solidDevtoolsKey].id);
        if (childIds.length) {
            const rp = findOrRegisterAncestorOrSelf(this.parent, this.registry);
            if (!before) {
                this.channel.send('domNodeAppended', {parentId: rp[solidDevtoolsKey].id, childIds});
            } else {
                const prev = findRegisteredPrevSiblingOrSelf(before.previousSibling);
                const next = findRegisteredNextSiblingOrSelf(before);
                this.channel.send('domNodeInserted', {parentId: rp[solidDevtoolsKey].id, childIds, prevId: prev?.[solidDevtoolsKey].id, nextId: next?.[solidDevtoolsKey].id});
            }
        }
        this.parent.insertBefore(child, before);
    }

    replaceChild(newChild: Node & NodeExtra, oldChild: Node & NodeExtra): void {
        const childIds = findRegisteredDescendantsOrSelf(newChild).map(c => c[solidDevtoolsKey].id);
        const prev = childIds.length ? findRegisteredPrevSiblingOrSelf(oldChild.previousSibling) : undefined;
        const next = childIds.length ? findRegisteredNextSiblingOrSelf(oldChild.nextSibling) : undefined;
        this.nodeRemoved(oldChild);
        if (childIds.length) {
            const rp = findOrRegisterAncestorOrSelf(this.parent, this.registry);
            this.channel.send('domNodeInserted', {parentId: rp[solidDevtoolsKey].id, childIds, prevId: prev?.[solidDevtoolsKey].id, nextId: next?.[solidDevtoolsKey].id});
        }
        this.parent.replaceChild(newChild, oldChild);
    }

    nodeRemoved(node: Node & NodeExtra) {
        const rc = findRegisteredDescendantsOrSelf(node);
        for (const e of rc) {
            this.channel.send('domNodeGone', {id: e[solidDevtoolsKey].id});
        }
        unregisterDomNode(node, this.registry);
    }
}

function findOrRegisterAncestorOrSelf(node: Node & NodeExtra, registry: Registry): Node & Required<NodeExtra> {
    let result: Node & NodeExtra | null = node;
    let lastParent: Node & NodeExtra | null = null;
    while (result && !result[solidDevtoolsKey]) {
        lastParent = result;
        result = result.parentNode;
    }
    if (result?.[solidDevtoolsKey]) {
        return result as Node & Required<NodeExtra>;
    } else { // result is null, and lastParent is not null and not registered
        return registry.registerDomNode(lastParent!);
    }
}

/*
function findRegisteredAncestorOrSelf(node: Node & NodeExtra): Node & Required<NodeExtra> | null {
    let result: Node & NodeExtra | null = node;
    while (result && !result[solidDevtoolsKey]) {
        result = result.parentNode;
    }
    return result as Node & Required<NodeExtra>;
}
*/

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
    const next: Node[] = [];
    let c = node.firstChild;
    while (c) {
        registry.unregisterDomNode(c);
        next.push(c);
        c = c.nextSibling;
    }
    for (const n of next) {
        unregisterDomNode(n, registry);
    }
}

function createInsertParentWrapper(parent: Node, registry: Registry, channel: Channel<'page'>): {} {
    return parent instanceof InsertParentWrapperImpl ? parent : new InsertParentWrapperImpl(parent, registry, channel);
}

export {createInsertParentWrapper};
