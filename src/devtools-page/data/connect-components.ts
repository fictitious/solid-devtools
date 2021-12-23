
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
    const nodeComponents = connectNodeResultOf(componentMap, logger, node, parentComponent);
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
function connectNodeResultOf(componentMap: Map<string, ComponentMirror>, logger: Logger, node: DomNodeMirror, parent?: ComponentMirror): ConnectedResult | undefined {
    let result: ConnectedResult | undefined;
    let lowerComponent: ComponentMirror | undefined;
    for (const componentId of node.resultOf) {
        const component = componentMap.get(componentId);
        if (!component) {
            logger('error', `connectNodeResultOf: component id ${componentId} is not found for result node ${node.id}`);
        } else {
            if (!result) {
                result = {bottom: component};
            }
            if (!component.parent) {
                component.connectedResultIndex = component.result.indexOf(node);
                result.top = component;
                // component.parent will be assigned later, either on the next iteration (lowerComponent)
                // or before returning from here if parent !== undefined
                // or in the registry-mirror after returning from connectDomTree
                // (note that registry-mirror always calls connectDomTree with parent === undefined, then connects the result)
            } else {
                result.top = undefined;
            }
            if (lowerComponent && !lowerComponent.parent) {
                lowerComponent.parent = {parentKind: 'component', component};
                component.children.push(lowerComponent);
                updateChildrenData(component.componentData, component.children);
            }
            lowerComponent = component;
        }
    }
    if (parent && result?.top) {
        result.top.parent = {parentKind: 'component', component: parent};
        parent.children.push(result.top);
        updateChildrenData(parent.componentData, parent.children);
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
            if (resultOf.parent) {
                connectedWithSameResult = resultOf;
            }
        }
    }
    if (connectedWithSameResult) {
        const {parentChildren, childrenData} = getComponentParentChildren(connectedWithSameResult.parent!);
        const index = parentChildren.indexOf(component);
        if (index < 0) {
            logger('error', `connectedResultAdded: component ${component.id} is missing from its parent chldren: parent: ${JSON.stringify(connectedWithSameResult)}`);
        } else {
            connectedWithSameResult.parent = {parentKind: 'component', component};
            component.children.push(connectedWithSameResult);
            updateChildrenData(component.componentData, component.children);

            parentChildren[index] = component;
            updateChildrenData(childrenData, parentChildren);
        }
    } else {
        // if there are some (already connected) components below the node, insert between those components (that have common parent) and their parent
        const belowComponents = node.children.flatMap(c => findConnectedComponentsAtOrBelow(componentMap, logger, c));
        if (belowComponents.length) {
            const belowSameParent = belowComponents.filter(c => haveSameParent(c, belowComponents[0]));
            const {parentChildren, childrenData: parentChildrenData} = getComponentParentChildren(belowComponents[0].parent!);
            const belowSameParentIndices = belowSameParent.map(c => parentChildren.indexOf(c));
            const minIndex = Math.min(...belowSameParentIndices);
            if (minIndex < 0) {
                logger('error', `connectedResultAdded: below component ${belowComponents[0].id} is missing from its parent chldren: parent: ${JSON.stringify(belowComponents[0].parent!)}`);
            } else {
                const newParent = {parentKind: 'component', component} as const;
                belowSameParent.forEach(c => c.parent = newParent);
                component.children.push(...belowSameParent);
                updateChildrenData(component.componentData, component.children);
                // replace the first children which is now below the parent with the parent, remove the rest
                parentChildren[minIndex] = component;
                for (let n = 1; n < belowSameParentIndices.length; ++n) {
                    if (belowSameParentIndices[n] != minIndex) {
                        parentChildren.splice(belowSameParentIndices[n], 1);
                    }
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
        if (!prevSiblingComponent.parent) {
            logger('error', `findAndConnectToParentComponent: found prev sibling which is unexpectedly not connected: prev sibling id=${prevSiblingComponent.id}`);
        } else {
            const {parentChildren: parentComponentChildren, childrenData} = getComponentParentChildren(prevSiblingComponent.parent);
            const prevSiblingComponentIndex = parentComponentChildren.indexOf(prevSiblingComponent);
            if (prevSiblingComponentIndex < 0) {
                logger('error', `findAndConnectToParentComponent: found prev sibling which is missing from its parent children: prev sibling id=${prevSiblingComponent.id}`);
            } else {
                components.forEach(c => c.parent = prevSiblingComponent.parent);
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
            if (!nextSiblingComponent.parent) {
                logger('error', `findAndConnectToParentComponent: found next sibling which is unexpectedly not connected: next sibling id=${nextSiblingComponent.id}`);
            } else {
                const {parentChildren: parentComponentChildren, childrenData} = getComponentParentChildren(nextSiblingComponent.parent);
                const nextSiblingComponentIndex = parentComponentChildren.indexOf(nextSiblingComponent);
                if (nextSiblingComponentIndex < 0) {
                    logger('error', `findAndConnectToParentComponent: found next sibling which is missing from its parent children: next sibling id=${nextSiblingComponent.id}`);
                } else {
                    components.forEach(c => c.parent = nextSiblingComponent.parent);
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
                    if (resultOf.result[resultOf.connectedResultIndex!].parent === parentNode) {
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
                components.forEach(c => c.parent = p);
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
                        components.forEach(c => c.parent = {parentKind: 'root', root});
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

function haveSameParent(c1: ComponentMirror, c2: ComponentMirror) {
    if (c1.parent && c2.parent) {
        if (c1.parent.parentKind === 'component') {
            return c2.parent.parentKind === 'component' && c2.parent.component === c1.parent.component;
        } else {
            return c2.parent.parentKind === 'root' && c2.parent.root === c1.parent.root;
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
            if (resultOf.result[resultOf.connectedResultIndex!].parent === node.parent) { // note: root node can not really be in resultOf
                                                                                          // also, result of array access with undefined index is also undefined
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
    const parent = component.parent;
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
    delete component.parent;
    delete component.connectedResultIndex;
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
                if (resultIndex === component.connectedResultIndex) {
                    const newIndex = component.result.findIndex(n => n.connected && n.parent === node.parent);
                    if (newIndex >= 0) {
                        component.connectedResultIndex = newIndex;
                    } else {
                        delete component.connectedResultIndex;
                    }
                } else if (component.connectedResultIndex !== undefined && component.connectedResultIndex > resultIndex) {
                    --component.connectedResultIndex;
                }
            }
        }
    }
}

export {connectDomTree, disconnectDomTree, connectedResultAdded, findAndConnectToParentComponent, removeComponentFromTree, removeDomNodeFromComponentResult};