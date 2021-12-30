

import type {Channel} from '../../channel/channel-message-types';
import type {Registry, NodeExtra} from './registry';
import {solidDevtoolsKey} from './registry';
import {findOrRegisterAncestorOrSelf, findRegisteredDescendantsOrSelf, findRegisteredPrevSiblingOrSelf, findRegisteredNextSiblingOrSelf} from './node-functions';

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
            this.registry.domNodeAppended({parentId: rp[solidDevtoolsKey].id, childIds});
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
                this.registry.domNodeAppended({parentId: rp[solidDevtoolsKey].id, childIds});
            } else {
                this.registry.domNodeInserted({
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
            this.registry.domNodeInserted({
                parentId: rp[solidDevtoolsKey].id,
                childIds,
                prevId: findSiblings?.prev?.[solidDevtoolsKey].id,
                nextId: findSiblings?.next?.[solidDevtoolsKey].id
            });
        }
        this.parent.replaceChild(newChild, oldChild);
    }

    nodeRemoved(node: Node & NodeExtra) {
        this.registry.nodeRemoved(node);
    }
}

function createInsertParentWrapper(parent: Node, registry: Registry, channel: Channel<'page'>): {} {
    return parent instanceof InsertParentWrapperImpl ? parent : new InsertParentWrapperImpl(parent, registry, channel);
}

export {createInsertParentWrapper};
