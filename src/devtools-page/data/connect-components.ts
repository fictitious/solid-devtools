
import type {ComponentChildrenData} from './component-data-types';
import {updateChildrenData} from './component-data';
import type {ComponentMirror, ComponentParent, DomNodeMirror, RegistryRoot} from './registry-mirror-types';
import type {Logger} from './debug-log';

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
export interface ConnectedResult {
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
        for (const componentId of node.resultOf) {
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
function connectedResultAdded(roots: RegistryRoot[], componentMap: Map<string, ComponentMirror>, logger: Logger, component: ComponentMirror, node: DomNodeMirror, indexInResult: number): void {
    let connectedWithSameResult: ComponentMirror | undefined;
    let i = indexInResult;
    // if there's some already connected component below with the same result, insert between that component and its parent
    while (i > 0 && !connectedWithSameResult) {
        --i;
        const resultOf = componentMap.get(node.resultOf[i]);
        if (!resultOf) {
            logger('error', `connectedResultAdded: component id ${node.resultOf[i]} is not found for result node ${node.id}`);
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
            logger('error', `connectedResultAdded: component ${connectedWithSameResult.id} is missing from its parent chldren: parent: ${JSON.stringify(connectedWithSameResult.componentParent!)}`);
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
                logger('error', `connectedResultAdded: below component ${belowComponents[0].id} is missing from its parent chldren: parent: ${JSON.stringify(belowComponents[0].componentParent!)}`);
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
                    logger('error', `connectedResultAdded: node ${node.id} is missing from its parent children: parent: ${JSON.stringify(parentNode)}`);
                } else {
                    findAndConnectToParentComponent({roots, componentMap, logger, components: [component], parentNode, prevSiblingIndex: index - 1, nextSiblingIndex: index + 1});
                }
            }
        }
    }
}

export interface FindAndConnectToParentComponent {
    roots: RegistryRoot[];
    componentMap: Map<string, ComponentMirror>;
    logger: Logger;
    components: ComponentMirror[]; // components to find parent for
    parentNode: DomNodeMirror;  // results of components are children of this node
    prevSiblingIndex: number;  // which are between prevSiblingIndex and nextSiblingIndex
    nextSiblingIndex: number; // in the parentNode children
}
function findAndConnectToParentComponent({roots, componentMap, logger, parentNode, components, prevSiblingIndex, nextSiblingIndex}: FindAndConnectToParentComponent): void {
    const parentChildren = parentNode.children;
    let siblingComponents: ComponentMirror[] = [];
    let i = prevSiblingIndex;
    while (i >= 0 && siblingComponents.length === 0) {
        siblingComponents = findConnectedComponentsAtOrBelow(componentMap, logger, parentChildren[i]);
        --i;
    }
    if (siblingComponents.length) { // found prev sibling
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
    } else {
        i = nextSiblingIndex;
        while (i < parentChildren.length && siblingComponents.length === 0) {
            siblingComponents = findConnectedComponentsAtOrBelow(componentMap, logger, parentChildren[i]);
            ++i;
        }
        if (siblingComponents.length) { // found next sibling
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
                    parentComponentChildren.splice(nextSiblingIndex, 0, ...components);
                    updateChildrenData(childrenData, parentComponentChildren);
                }
            }
        } else {
            // no components found in siblings - see if parentNode has one
            let parentComponent: ComponentMirror | undefined;
            i = parentNode.resultOf.length;
            while (i > 0 && !parentComponent) {
                --i;
                const resultOf = componentMap.get(parentNode.resultOf[i]);
                if (!resultOf) {
                    logger('error', `findAndConnectToParentComponent: component id ${parentNode.resultOf[i]} is not found for result node ${parentNode.id}`);
                } else {
                    if (resultOf.connectedNodeParentId === parentNode.id) {
                        parentComponent = resultOf;
                    }
                }
            }
            if (parentComponent) {
                // there were no components attached to parent node children so, if the parentComponent chilren is not empty,
                // there's no way to tell where to insert ??
                if (parentComponent.children.length > 0) {
                    logger('warn', `findAndConnectToParentComponent: no components found in the connected nodes for the result node, but component has child components: component id ${parentComponent.id}`);
                }
                const p = {parentKind: 'component', component: parentComponent} as const;
                components.forEach(c => c.componentParent = p);
                parentComponent.children.splice(0, 0, ...components);
                updateChildrenData(parentComponent.componentData, parentComponent.children);
            } else {
                if (!parentNode.parent) {
                    const root = roots.find(r => r.domNode === parentNode);
                    if (!root) {
                        logger('error', `findAndConnectToParentComponent: connected node without a parent is not present in roots: node id ${parentNode.id}`);
                    } else {
                        // if we got here there's (really ?) no other components below this root
                        if (root.components.length > 0) {
                            logger('warn', `findAndConnectToParentComponent: no components found in the connected nodes tree under the root node,` +
                                            ` but root has child components: parent node id ${parentNode.id} root ${JSON.stringify(root)}`);
                        }
                        const p = {parentKind: 'root', root} as const;
                        components.forEach(c => c.componentParent = p);
                        root.components.push(...components);
                        updateChildrenData(root.rootData, root.components);
                    }
                } else {
                    const index = parentNode.parent.children.indexOf(parentNode);
                    if (index < 0) {
                        logger('error', `findAndConnectToParentComponent: node ${parentNode.id} is missing from its parent children: parent: ${JSON.stringify(parentNode.parent)}`);
                    } else {
                        findAndConnectToParentComponent({roots, componentMap, logger, parentNode: parentNode.parent, components, prevSiblingIndex: index - 1, nextSiblingIndex: index + 1});
                    }
                }
            }
        }
    }
}

function sameComponentParent(c1: ComponentMirror, c2: ComponentMirror) {
    if (c1.componentParent && c2.componentParent) {
        if (c1.componentParent.parentKind === 'component') {
            return c2.componentParent.parentKind === 'component' && c2.componentParent.component === c1.componentParent.component;
        } else {
            return c2.componentParent.parentKind === 'root' && c2.componentParent.root === c1.componentParent.root;
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
        const root = componentParent.root;
        return {parentChildren: root.components, childrenData: root.rootData};
    }
}

function findConnectedComponentsAtOrBelow(componentMap: Map<string, ComponentMirror>, logger: Logger, node: DomNodeMirror): ComponentMirror[] {
    let component: ComponentMirror | undefined;
    let i = node.resultOf.length;
    while (i > 0 && !component) {
        --i;
        const resultOf = componentMap.get(node.resultOf[i]);
        if (!resultOf) {
            logger('error', `findConnectedComponentsBelow: component id ${node.resultOf[i]} is not found for result node ${node.id}`);
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
            logger('error', `removeComponentFromTree: component ${component.id} is missing from its parent chldren: parent: ${JSON.stringify(parent)}`);
        } else {
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
    for (const componentId of node.resultOf) {
        const component = componentMap.get(componentId);
        if (!component) {
            logger('error', `removeDomNodeFromComponentResult: component id ${componentId} is not found for result node ${node.id}`);
        } else {
            const resultIndex = component.result.indexOf(node);
            if (resultIndex < 0) {
                logger('error', `removeDomNodeFromComponentResult: component id ${componentId}: result node ${node.id} is missing from component.result`);
            } else {
                component.result.splice(resultIndex, 1);
                if (!component.result.some(n => n.parent?.id === component.connectedNodeParentId)) {
                    delete component.connectedNodeParentId;
                }
            }
        }
    }
}

export {connectDomTree, disconnectDomTree, connectedResultAdded, findAndConnectToParentComponent, removeComponentFromTree, removeDomNodeFromComponentResult};
