
import type {SerializedValue} from '../../channel/channel-transport-types';
import type {RegistryRoot, ComponentMirror, ComponentParent, ComponentResultMirror, DomNodeMirror} from './registry-mirror-types';

function stringify(o: ComponentParent | DomNodeMirror | RegistryRoot): string {
    let s;
    if ('parentKind' in o) {
        s = prepareComponentParentForStringify({parent: o, deep: true});
    } else if ('nodeType' in o) {
        s = prepareDomNodeForStringify(o);
    } else if ('rootData' in o) {
        s = prepareRegistryRootForStringify(o);
    }
    return JSON.stringify(s);
}

interface StringifiedComponentMirror { // references replaced with ids
    id: string;
    name: string;
    props: SerializedValue;
    result: StringifiedComponentResult;
    componentParent: StringifiedComponentParent | undefined;
    children: string[];
}

function prepareComponentForStringify(component: ComponentMirror): StringifiedComponentMirror {
    return {
        ...component,
        name: component.componentData.name,
        props: component.componentData.props,
        result: prepareComponentResultForStringify(component.result),
        componentParent: prepareComponentParentForStringify({parent: component.componentParent}),
        children: component.children.map(c => c.id)
    };
}

type StringifiedComponentParent = StringifiedComponentParentRoot | StringifiedComponentParentComponent;

interface StringifiedComponentParentRoot {
    parentKind: 'root';
    root: StringifiedRegistryRoot;
}

interface StringifiedComponentParentComponent {
    parentKind: 'component';
    component: string | StringifiedComponentMirror;
}

function prepareComponentParentForStringify({parent, deep = false}: {parent: ComponentParent | undefined; deep?: boolean}): StringifiedComponentParent | undefined {
    if (parent) {
        if (parent.parentKind === 'component') {
            return {parentKind: parent.parentKind, component: deep ? prepareComponentForStringify(parent.component) : parent.component.id};
        } else {
            return {parentKind: parent.parentKind, root: prepareRegistryRootForStringify(parent.root)};
        }
    } else {
        return undefined;
    }
}

interface StringifiedRegistryRoot {
    domNode: string;
    components: string[];
}
function prepareRegistryRootForStringify(root: RegistryRoot): StringifiedRegistryRoot {
    return {
        domNode: root.domNode.id,
        components: root.components.map(c => c.id)
    };
}

type StringifiedComponentResult = string | StringifiedComponentResult[] | undefined;

function prepareComponentResultForStringify(result: ComponentResultMirror[]): StringifiedComponentResult {
    return result.map(r => Array.isArray(r) ? prepareComponentResultForStringify(r) : r ? r.id : undefined);
}

function prepareDomNodeForStringify(domNode: DomNodeMirror) {
    return {
        ...domNode,
        parent: domNode.parent?.id,
        children: domNode.children.map(c => c.id)
    };
}

export {stringify};
