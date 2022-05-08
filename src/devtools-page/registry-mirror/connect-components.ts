

import type {ComponentChildrenData} from '../data/component-data-types';
import {updateChildrenData} from '../data/component-data';
import type {ComponentMirror, ComponentResultMirror, ComponentParent, DomNodeMirror, RegistryDomRoot} from './registry-mirror-types';
import type {Logger} from '../data/logger-types';
import {stringify} from './stringify';

/*
  Maintain a sparse tree of components inside DomNodeMirror tree
  similar to how the sparse tree of registered nodes is maintained inside dom tree
  in the hook/wrappers/insert-parent-wrapper.ts.
  The difference here is that comnponent has a reference to its parent component.
*/

// when node is inserted into the DOM tree, mark all nodes below as connected
// find and connect all components below it which are not connected yet
// return top non-connected components from node or below it if there are any
function connectDomTree(componentMap: Map<string, ComponentMirror>, logger: Logger, node: DomNodeMirror, parentComponent?: ComponentMirror): ComponentMirror[] {
    node.connected = true;
    const nodeComponents = node.resultOf.length > 0 ? connectNodeResultOf(componentMap, logger, node, parentComponent) : undefined;
    const childComponents = node.children.flatMap(c => connectDomTree(componentMap, logger, c, nodeComponents?.bottom || parentComponent));
    // nodeComponents && !nodeComponents.top means that top is already connected which means childComponents should already be connected to it via bottom
    return nodeComponents ? nodeComponents.top ? [nodeComponents.top] : [] : childComponents;
}

// returns undefined if the node is not a result of any component
// otherwise, top is the top not yet connected component to be passed up as a result of this subtree
// bottom is the component to become the parent of components found in child nodes
//
// NOTE: tree is traversed from left to right in the caller (connectDomTree),
// so found child components can be just pushed to the parent component children array
interface ConnectedResult {
    top?: ComponentMirror;
    bottom: ComponentMirror;
}
function connectNodeResultOf(componentMap: Map<string, ComponentMirror>, logger: Logger, node: DomNodeMirror, parentComponent?: ComponentMirror): ConnectedResult | undefined {
    let result: ConnectedResult | undefined;
    if (!node.parent) {
        // connectDomTree and connectNodeResultOf are always called with node.connected === true, so !node.parent means it's root
        logger('error', `connetNodeResultOf: connected result node is root: this is unexpected. node id ${node.id}`);
    } else {
        let lowerComponent: ComponentMirror | undefined;
        for (const {id: componentId} of node.resultOf) {
            const component = componentMap.get(componentId);
            if (!component) {
                logger('error', `connectNodeResultOf: component id ${componentId} is not found for result node ${node.id}`);
            } else {
                if (!result) {
                    result = {bottom: component};
                }
                if (!component.componentParent) {
                    component.connectedNodeParentId = node.parent.id;
                    result.top = component;
                    // component.parent will be assigned later, either on the next iteration (lowerComponent)
                    // or before returning from here if parent !== undefined
                    // or in the registry-mirror after returning from connectDomTree
                    // (note that registry-mirror always calls connectDomTree with parent === undefined, then connects the result)
                } else {
                    result.top = undefined;
                    if (component.connectedNodeParentId && component.connectedNodeParentId !== node.parent.id) {
                        logger(
                            'error',
                            `connectNodeResultOf: component id ${componentId} has two results with different parent: this is not expected. result parent ids ${component.connectedNodeParentId} ${node.parent.id}`
                        );
                    }
                }
                if (lowerComponent && !lowerComponent.componentParent) {
                    lowerComponent.componentParent = {parentKind: 'component', component};
                    component.children.push(lowerComponent);
                    updateChildrenData(component.componentData, component.children);
                }
                lowerComponent = component;
            }
        }
        if (parentComponent && result?.top) {
            result.top.componentParent = {parentKind: 'component', component: parentComponent};
            parentComponent.children.push(result.top);
            updateChildrenData(parentComponent.componentData, parentComponent.children);
        }
    }
    return result;
}

// when node is removed from the DOM tree, mark all nodes below as disconnected
// components stay until their onCleanup is called
function disconnectDomTree(node: DomNodeMirror): void {
    delete node.connected;
    for (const c of node.children) {
        disconnectDomTree(c);
    }
}

// when a connected node is added to the result of a not yet connected component, connect the component
function connectedResultAdded(domRoots: RegistryDomRoot[], componentMap: Map<string, ComponentMirror>, logger: Logger, component: ComponentMirror, node: DomNodeMirror, indexInResult: number): void {
    let connectedWithSameResult: ComponentMirror | undefined;
    let i = indexInResult;
    // if there's some already connected component below with the same result, insert between that component and its parent
    while (i > 0 && !connectedWithSameResult) {
        --i;
        const resultOf = componentMap.get(node.resultOf[i].id);
        if (!resultOf) {
            logger('error', `connectedResultAdded: component id ${node.resultOf[i].id} is not found for result node ${node.id}`);
        } else {
            if (resultOf.componentParent) {
                connectedWithSameResult = resultOf;
            }
        }
    }
    if (connectedWithSameResult) {
        const {parentChildren, childrenData} = getComponentParentChildren(connectedWithSameResult.componentParent!);
        const index = parentChildren.indexOf(connectedWithSameResult);
        if (index < 0) {
            logger('error', `connectedResultAdded: component ${connectedWithSameResult.id} is missing from its parent chldren: parent: ${stringify(connectedWithSameResult.componentParent!)}`);
        } else {
            const upperParent = connectedWithSameResult.componentParent;
            connectedWithSameResult.componentParent = {parentKind: 'component', component};
            component.children.push(connectedWithSameResult);
            updateChildrenData(component.componentData, component.children);

            component.componentParent = upperParent;
            parentChildren[index] = component;
            updateChildrenData(childrenData, parentChildren);
        }
    } else {
        // if there are some (already connected) components below the node, insert between those components (that have common parent) and their parent
        const belowComponents = node.children.flatMap(c => findConnectedComponentsAtOrBelow(componentMap, logger, c));
        if (belowComponents.length) {
            const belowSameParent = belowComponents.filter(c => sameComponentParent(c, belowComponents[0]));
            const upperParent = belowComponents[0].componentParent!;
            const {parentChildren, childrenData: parentChildrenData} = getComponentParentChildren(upperParent);
            const belowSameParentIndices = belowSameParent.map(c => parentChildren.indexOf(c));
            // sort it so that we can splice it out of parentChildren one by one in reverse order
            // so that each splice does not affect the indices for the remaining splices
            belowSameParentIndices.sort();
            const minIndex = belowSameParentIndices[0];
            if (minIndex < 0) {
                logger('error', `connectedResultAdded: below component ${belowComponents[0].id} is missing from its parent chldren: parent: ${stringify(belowComponents[0].componentParent!)}`);
            } else {
                const p = {parentKind: 'component', component} as const;
                belowSameParent.forEach(c => c.componentParent = p);
                component.children.push(...belowSameParent);
                updateChildrenData(component.componentData, component.children);

                // replace the first children which is now below the component with the component, remove the rest
                parentChildren[minIndex] = component;
                component.componentParent = upperParent;
                let n = belowSameParentIndices.length;
                while (n > 1) {
                    --n;
                    parentChildren.splice(belowSameParentIndices[n], 1);
                }
                updateChildrenData(parentChildrenData, parentChildren);
            }
        } else {
            // find a parent component to connect to
            const parentNode = node.parent;
            if (!parentNode) {
                // connected node without a parent means its a root node
                // but root node can not (really ?) be a result of a component
                logger('error', `connectedResultAdded: result node ${node.id} is connected but does not have a parent - this is unexpected`);
            } else {
                const index = parentNode.children.indexOf(node);
                if (index < 0) {
                    logger('error', `connectedResultAdded: node ${node.id} is missing from its parent children: parent: ${stringify(parentNode)}`);
                } else {
                    findAndConnectToParentComponent({domRoots, componentMap, logger, components: [component], parentNode, prevSiblingIndex: index - 1, nextSiblingIndex: index + 1});
                }
            }
        }
    }
}

interface FindAndConnectToParentComponent {
    domRoots: RegistryDomRoot[];
    componentMap: Map<string, ComponentMirror>;
    logger: Logger;
    components: ComponentMirror[]; // components to find parent for
    parentNode: DomNodeMirror;  // results of components are children of this node
    prevSiblingIndex: number;  // which are between prevSiblingIndex and nextSiblingIndex
    nextSiblingIndex: number; // in the parentNode children
}
function findAndConnectToParentComponent({domRoots, componentMap, logger, parentNode, components, prevSiblingIndex, nextSiblingIndex}: FindAndConnectToParentComponent): void {
    if (!findAndConnectToParentComponentInPrevSiblings({components, nodes: parentNode.children, siblingIndex: prevSiblingIndex, componentMap, logger})) {
        if (!findAndConnectToParentComponentInNextSiblings({components, nodes: parentNode.children, siblingIndex: nextSiblingIndex, componentMap, logger})) {
            // no components found in siblings - see if parentNode has one, starting from the bottom
            let parentComponent: ComponentMirror | undefined;
            let i = 0;
            while (i < parentNode.resultOf.length && !parentComponent) {
                const resultOf = componentMap.get(parentNode.resultOf[i].id);
                if (!resultOf) {
                    logger('error', `findAndConnectToParentComponent: component id ${parentNode.resultOf[i].id} is not found for result node ${parentNode.id}`);
                } else {
                    if (resultOf.connectedNodeParentId !== undefined && resultOf.connectedNodeParentId === parentNode.parent?.id) {
                        parentComponent = resultOf;
                    }
                }
                ++i;
            }
            if (parentComponent) {
                connectToParentComponent({parentComponent, parentNode, components, logger, componentMap});
            } else {
                if (!parentNode.parent) {
                    const domRoot = domRoots.find(r => r.domNode === parentNode);
                    if (!domRoot) {
                        logger('error', `findAndConnectToParentComponent: connected node without a parent is not present in domRoots: node id ${parentNode.id}`);
                    } else {
                        // if we got here there's (really ?) no other components below this domRoot
                        if (domRoot.components.length > 0) {
                            logger('warn', `findAndConnectToParentComponent: no components found in the connected nodes tree under the dom root node,` +
                                            ` but dom root has child components: parent node id ${parentNode.id} dom root ${stringify(domRoot)}`);
                        }
                        const p = {parentKind: 'domroot', domRoot} as const;
                        components.forEach(c => c.componentParent = p);
                        domRoot.components.push(...components);
                        updateChildrenData(domRoot.domRootData, domRoot.components);
                    }
                } else {
                    const index = parentNode.parent.children.indexOf(parentNode);
                    if (index < 0) {
                        logger('error', `findAndConnectToParentComponent: node ${parentNode.id} is missing from its parent children: parent: ${stringify(parentNode.parent)}`);
                    } else {
                        findAndConnectToParentComponent({domRoots, componentMap, logger, parentNode: parentNode.parent, components, prevSiblingIndex: index - 1, nextSiblingIndex: index + 1});
                    }
                }
            }
        }
    }
}

interface FindAndConnectToParentComponentInSiblings {
    components: ComponentMirror[]; // components to find parent for
    nodes: DomNodeMirror[];       // nodes where to look for parent component
    siblingIndex: number;        // index in nodes where to start looking
    componentMap: Map<string, ComponentMirror>;
    logger: Logger;
}

interface FindSiblingAndConnectToParentComponent {
    components: ComponentMirror[];
    parentComponent: ComponentMirror;
    nodes: DomNodeMirror[];
    siblingIndex: number;
    componentMap: Map<string, ComponentMirror>;
    logger: Logger;
}

interface ConnectToSiblingParentComponent {
    siblingComponents: ComponentMirror[];
    components: ComponentMirror[];
    logger: Logger;
}

function findAndConnectToParentComponentInPrevSiblings({components, nodes,  siblingIndex, componentMap, logger}: FindAndConnectToParentComponentInSiblings): boolean {
    let siblingComponents: ComponentMirror[] = [];
    let i = siblingIndex;
    while (i >= 0 && siblingComponents.length === 0) {
        siblingComponents = findConnectedComponentsAtOrBelow(componentMap, logger, nodes[i]);
        --i;
    }
    return connectToPrevSiblingParentComponent({siblingComponents, components, logger});
}

function findPrevSiblingAndConnectToParentComponent({components, parentComponent, nodes, siblingIndex, componentMap, logger}: FindSiblingAndConnectToParentComponent): boolean {
    let siblingComponents: ComponentMirror[] = [];
    let i = siblingIndex;
    while (i >= 0 && siblingComponents.length === 0) {
        siblingComponents = nodes[i].children.flatMap(n => findConnectedComponentsAtOrBelow(componentMap, logger, n)).filter(c => isComponentParent({c, parentComponent}));
        --i;
    }
    return connectToPrevSiblingParentComponent({siblingComponents, components, logger});
}

function connectToPrevSiblingParentComponent({siblingComponents, components,  logger}: ConnectToSiblingParentComponent): boolean {
    const found = siblingComponents.length > 0;
    if (found) {
        const prevSiblingComponent = siblingComponents[siblingComponents.length - 1];
        if (!prevSiblingComponent.componentParent) {
            logger('error', `findAndConnectToParentComponent: found prev sibling which is unexpectedly not connected: prev sibling id=${prevSiblingComponent.id}`);
        } else {
            const {parentChildren: parentComponentChildren, childrenData} = getComponentParentChildren(prevSiblingComponent.componentParent);
            const prevSiblingComponentIndex = parentComponentChildren.indexOf(prevSiblingComponent);
            if (prevSiblingComponentIndex < 0) {
                logger('error', `findAndConnectToParentComponent: found prev sibling which is missing from its parent children: prev sibling id=${prevSiblingComponent.id}`);
            } else {
                components.forEach(c => c.componentParent = prevSiblingComponent.componentParent);
                parentComponentChildren.splice(prevSiblingComponentIndex + 1, 0, ...components);
                updateChildrenData(childrenData, parentComponentChildren);
            }
        }
    }
    return found; // proper parent was found, so no need to keep searching on error
}

function findAndConnectToParentComponentInNextSiblings({components, nodes, siblingIndex, componentMap, logger}: FindAndConnectToParentComponentInSiblings): boolean {
    let siblingComponents: ComponentMirror[] = [];
    let i = siblingIndex;
    while (i < nodes.length && siblingComponents.length === 0) {
        siblingComponents = findConnectedComponentsAtOrBelow(componentMap, logger, nodes[i]);
        ++i;
    }
    return connectToNextSiblingParentComponent({siblingComponents, components, logger});
}

function findNextSiblingAndConnectToParentComponent({components, parentComponent, nodes, siblingIndex, componentMap, logger}: FindSiblingAndConnectToParentComponent): boolean {
    let siblingComponents: ComponentMirror[] = [];
    let i = siblingIndex;
    while (i < nodes.length && siblingComponents.length === 0) {
        siblingComponents = nodes[i].children.flatMap(n => findConnectedComponentsAtOrBelow(componentMap, logger, n)).filter(c => isComponentParent({c, parentComponent}));
        ++i;
    }
    return connectToNextSiblingParentComponent({siblingComponents, components, logger});
}

function connectToNextSiblingParentComponent({siblingComponents, components, logger}: ConnectToSiblingParentComponent): boolean {
    const found = siblingComponents.length > 0;
    if (found) {
        const nextSiblingComponent = siblingComponents[0];
        if (!nextSiblingComponent.componentParent) {
            logger('error', `findAndConnectToParentComponent: found next sibling which is unexpectedly not connected: next sibling id=${nextSiblingComponent.id}`);
        } else {
            const {parentChildren: parentComponentChildren, childrenData} = getComponentParentChildren(nextSiblingComponent.componentParent);
            const nextSiblingComponentIndex = parentComponentChildren.indexOf(nextSiblingComponent);
            if (nextSiblingComponentIndex < 0) {
                logger('error', `findAndConnectToParentComponent: found next sibling which is missing from its parent children: next sibling id=${nextSiblingComponent.id}`);
            } else {
                components.forEach(c => c.componentParent = nextSiblingComponent.componentParent);
                parentComponentChildren.splice(nextSiblingComponentIndex, 0, ...components);
                updateChildrenData(childrenData, parentComponentChildren);
            }
        }
    }
    return found; // proper parent was found, so no need to keep searching on error
}

interface ConnectToParentComponent {
    parentComponent: ComponentMirror;
    parentNode: DomNodeMirror;
    components: ComponentMirror[];
    logger: Logger;
    componentMap: Map<string, ComponentMirror>;
}
function connectToParentComponent({parentComponent, parentNode, components, logger, componentMap}: ConnectToParentComponent): void {
    let connected = false;
    if (parentComponent.children.length > 0) {
        // need to find a place where to insert component
        if (parentNode.parent) {
            const parentChildren = parentNode.parent.children;
            const siblingIndex = parentChildren.indexOf(parentNode);
            if (siblingIndex < 0) {
                logger('error', `connectToParentComponent: parentNode is not found in its parent children. parentNode id=${parentNode.id}`);
            } else {
                connected = findPrevSiblingAndConnectToParentComponent({components, parentComponent, nodes: parentChildren, siblingIndex: siblingIndex - 1, componentMap, logger})
                    || findNextSiblingAndConnectToParentComponent({components, parentComponent, nodes: parentChildren, siblingIndex: siblingIndex + 1, componentMap, logger})
                ;
            }
        }
    }
    if (!connected) {
        if (parentComponent.children.length > 0) {
            // there were no components attached to parent node children or siblings so, if the parentComponent chilren is not empty,
            // there's no way to tell where to insert the component
            logger('warn', `connectToParentComponent: no components found in the connected nodes for the result node, but component has child components: component id ${parentComponent.id}`);
        }
        const p = {parentKind: 'component', component: parentComponent} as const;
        components.forEach(c => c.componentParent = p);
        parentComponent.children.splice(0, 0, ...components);
        updateChildrenData(parentComponent.componentData, parentComponent.children);
    }
}

function isComponentParent({c, parentComponent}: {c: ComponentMirror; parentComponent: ComponentMirror}): boolean {
    return c.componentParent?.parentKind === 'component' && c.componentParent.component === parentComponent;
}

function sameComponentParent(c1: ComponentMirror, c2: ComponentMirror) {
    if (c1.componentParent && c2.componentParent) {
        if (c1.componentParent.parentKind === 'component') {
            return c2.componentParent.parentKind === 'component' && c2.componentParent.component === c1.componentParent.component;
        } else {
            return c2.componentParent.parentKind === 'domroot' && c2.componentParent.domRoot === c1.componentParent.domRoot;
        }
    } else {
        return false;
    }
}

function getComponentParentChildren(componentParent: ComponentParent): {childrenData: ComponentChildrenData; parentChildren: ComponentMirror[]} {
    if (componentParent.parentKind === 'component') {
        const parent = componentParent.component;
        return {parentChildren: parent.children, childrenData: parent.componentData};
    } else {
        const domRoot = componentParent.domRoot;
        return {parentChildren: domRoot.components, childrenData: domRoot.domRootData};
    }
}

function findConnectedComponentsAtOrBelow(componentMap: Map<string, ComponentMirror>, logger: Logger, node: DomNodeMirror): ComponentMirror[] {
    let component: ComponentMirror | undefined;
    let i = node.resultOf.length;
    while (i > 0 && !component) {
        --i;
        const resultOf = componentMap.get(node.resultOf[i].id);
        if (!resultOf) {
            logger('error', `findConnectedComponentsBelow: component id ${node.resultOf[i].id} is not found for result node ${node.id}`);
        } else {
            if (resultOf.connectedNodeParentId !== undefined && resultOf.connectedNodeParentId === node.parent?.id) {
                component = resultOf;
            }
        }
    }
    if (component) {
        return [component];
    } else {
        return node.children.flatMap(c => findConnectedComponentsAtOrBelow(componentMap, logger, c));
    }
}

// when onCleanup is called for the component, disconnect it
function removeComponentFromTree(logger: Logger, component: ComponentMirror) {
    const parent = component.componentParent;
    if (parent) {
        const {parentChildren, childrenData} = getComponentParentChildren(parent);
        const index = parentChildren.indexOf(component);
        if (index < 0) {
            logger('error', `removeComponentFromTree: component ${component.id} is missing from its parent children: parent: ${stringify(parent)}`);
        } else {
            component.children.forEach(c => c.componentParent = parent);
            parentChildren.splice(index, 1, ...component.children);
            updateChildrenData(childrenData, parentChildren);
        }
    }
    delete component.componentParent;
    delete component.connectedNodeParentId;
    component.children.length = 0;
}

// when a node is removed from the DOM tree,
// remove it from results of any component it was a result of
// this does not affect the current state of component tree
// it affects the result that will be returned from findConnectedComponentsAtOrBelow
function removeDomNodeFromComponentResult(componentMap: Map<string, ComponentMirror>, logger: Logger, node: DomNodeMirror): void {
    for (const {id: componentId} of node.resultOf) {
        const component = componentMap.get(componentId);
        if (!component) {
            logger('error', `removeDomNodeFromComponentResult: component id ${componentId} is not found for result node ${node.id}`);
        } else {
            const {removed} = removeDomNodeFromResultArray(component.result, node);
            if (!removed) {
                logger('error', `removeDomNodeFromComponentResult: component id ${componentId}: result node ${node.id} is missing from component.result`);
            }
        }
    }
}

function removeDomNodeFromResultArray(result: ComponentResultMirror[], node: DomNodeMirror): {removed: boolean} {
    let removed = false;
    for (const [i, r] of result.entries()) {
        if (Array.isArray(r)) {
            const {removed: nestedRemoved} = removeDomNodeFromResultArray(r, node);
            removed = removed || nestedRemoved;
            if (r.length === 0) {
                result[i] = undefined;
            }
        } else {
            if (r === node) {
                result[i] = undefined;
                removed = true;
            }
        }
    }
    // shrink the array to remove undefined values from the end
    let newLength = result.length;
    while (newLength > 0 && result[newLength - 1] === undefined) {
        --newLength;
    }
    if (newLength !== result.length) {
        result.length = newLength;
    }
    return {removed};
}

export {connectDomTree, disconnectDomTree, connectedResultAdded, findAndConnectToParentComponent, removeComponentFromTree, removeDomNodeFromComponentResult};
