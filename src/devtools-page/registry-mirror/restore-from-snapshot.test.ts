
import {test, assert} from 'vitest';

import type {RegistrySnapshotMessageWithKind} from '../../channel/channel-message-types';
import type {ComponentParentComponent} from './registry-mirror-types';
import {createDebugLog} from '../data/logger';
import {createRegistryMirror} from './registry-mirror';
import {restoreMirrorFromSnapshot} from './restore-from-snapshot';

test('a', function() {

    const messages: Exclude<RegistrySnapshotMessageWithKind, {kind: 'snapshotCompleted'}>[] = [
        {'kind':'snapshotDomNode', 'nodeType':1, 'name':'DIV', 'id':'d-4', 'isRoot':true},
        {'kind':'snapshotDomNode', 'nodeType':1, 'name':'LI', 'id':'d-35', 'resultOf':['c-13', 'c-9']},
        {'kind':'snapshotDomNode', 'nodeType':1, 'name':'LI', 'id':'d-36', 'resultOf':['c-20', 'c-9']},
        {'kind':'snapshotDomNode', 'nodeType':1, 'name':'LI', 'id':'d-37', 'resultOf':['c-27', 'c-9']},
        {'kind':'snapshotDomNode', 'nodeType':1, 'name':'UL', 'id':'d-38', 'resultOf':['c-5']},
        {'kind':'snapshotComponent', 'id':'c-5', 'name':'App', 'rawName':'_Hot$$App', 'result':['d-38'], 'props':{'t':'object', 'v':{}}},
        {'kind':'snapshotComponent', 'id':'c-9', 'name':'For', 'rawName':'For', 'result':['d-35', 'd-36', 'd-37'],
            'props':{'t':'object', 'v':{'each':{'t':'getter'}, 'children':{'t':'function', 'name':'children'}}}},
        {'kind':'snapshotComponent', 'id':'c-13', 'name':'Cat', 'rawName':'_Hot$$Cat', 'result':['d-35'],
            'props':{'t':'object', 'v':{'index':{'t':'getter'}, 'cat':{'t':'object', 'v':{'id':{'t':'primitive', 'v':'J---aiyznGQ'}, 'name':{'t':'primitive', 'v':'Keyboard Cat'}}}}}},
        {'kind':'snapshotComponent', 'id':'c-20', 'name':'Cat', 'rawName':'_Hot$$Cat', 'result':['d-36'],
            'props':{'t':'object', 'v':{'index':{'t':'getter'}, 'cat':{'t':'object', 'v':{'id':{'t':'primitive', 'v':'z_AbfPXTKms'}, 'name':{'t':'primitive', 'v':'Maru'}}}}}},
        {'kind':'snapshotComponent', 'id':'c-27', 'name':'Cat', 'rawName':'_Hot$$Cat', 'result':['d-37'],
            'props':{'t':'object', 'v':{'index':{'t':'getter'}, 'cat':{'t':'object', 'v':{'id':{'t':'primitive', 'v':'OUtn3pvWmpg'}, 'name':{'t':'primitive', 'v':'Henri The Existential Cat'}}}}}},
        {'kind':'snapshotDomNodeAppended', 'parentId':'d-4', 'childIds':['d-38']},
        {'kind':'snapshotDomNodeAppended', 'parentId':'d-38', 'childIds':['d-35', 'd-36', 'd-37']}
    ];

    const logger = createDebugLog({}).logger();
    const registryMirror = createRegistryMirror(logger);
    for (const m of messages) {
        restoreMirrorFromSnapshot(registryMirror, m);
    }

    const app = registryMirror.getComponent('c-5');
    const f = registryMirror.getComponent('c-9');
    const cat1 = registryMirror.getComponent('c-13');
    const cat2 = registryMirror.getComponent('c-20');
    const cat3 = registryMirror.getComponent('c-27');

    assert.isDefined(app);
    assert.isDefined(f);
    assert.isDefined(cat1);
    assert.isDefined(cat2);
    assert.isDefined(cat3);

    assert.strictEqual(app.componentParent?.parentKind, 'domroot');
    assert.strictEqual(f.componentParent?.parentKind, 'component');
    assert.strictEqual(cat1.componentParent?.parentKind, 'component');
    assert.strictEqual(cat2.componentParent?.parentKind, 'component');
    assert.strictEqual(cat3.componentParent?.parentKind, 'component');

    const fParent = f.componentParent as ComponentParentComponent;
    const cat1Parent = cat1.componentParent as ComponentParentComponent;
    const cat2Parent = cat2.componentParent as ComponentParentComponent;
    const cat3Parent = cat3.componentParent as ComponentParentComponent;

    assert.strictEqual(cat1Parent.component.id, f.id);
    assert.strictEqual(cat2Parent.component.id, f.id);
    assert.strictEqual(cat3Parent.component.id, f.id);
    assert.strictEqual(fParent.component.id, app.id);
});

test('b', function() {

    const messages: Exclude<RegistrySnapshotMessageWithKind, {kind: 'snapshotCompleted'}>[] = [
        {'kind':'snapshotDomNode', 'nodeType':1, 'name':'DIV', 'id':'d-1', 'isRoot':true},
        {'kind':'snapshotDomNode', 'nodeType':1, 'name':'LI', 'id':'d-7', 'resultOf':['c-4', 'c-3']},
        {'kind':'snapshotDomNode', 'nodeType':1, 'name':'LI', 'id':'d-8', 'resultOf':['c-5', 'c-3']},
        {'kind':'snapshotDomNode', 'nodeType':1, 'name':'LI', 'id':'d-9', 'resultOf':['c-6', 'c-3']},
        {'kind':'snapshotDomNode', 'nodeType':1, 'name':'UL', 'id':'d-10', 'resultOf':['c-2']},
        {'kind':'snapshotComponent', 'id':'c-2', 'name':'App', 'rawName':'_Hot$$App', 'result':['d-10'], 'props':{'t':'object', 'v':{}}},
        {'kind':'snapshotComponent', 'id':'c-3', 'name':'For', 'rawName':'For', 'result':['d-7', 'd-8', 'd-9'],
            'props':{'t':'object', 'v':{'each':{'t':'getter'}, 'children':{'t':'function', 'name':'children'}}}},
        {'kind':'snapshotComponent', 'id':'c-4', 'name':'Cat', 'rawName':'_Hot$$Cat', 'result':['d-7'],
            'props':{'t':'object', 'v':{'index':{'t':'getter'}, 'cat':{'t':'object', 'v':{'id':{'t':'primitive', 'v':'J---aiyznGQ'}, 'name':{'t':'primitive', 'v':'Keyboard Cat'}}}}}},
        {'kind':'snapshotComponent', 'id':'c-5', 'name':'Cat', 'rawName':'_Hot$$Cat', 'result':['d-8'],
            'props':{'t':'object', 'v':{'index':{'t':'getter'}, 'cat':{'t':'object', 'v':{'id':{'t':'primitive', 'v':'z_AbfPXTKms'}, 'name':{'t':'primitive', 'v':'Maru'}}}}}},
        {'kind':'snapshotComponent', 'id':'c-6', 'name':'Cat', 'rawName':'_Hot$$Cat', 'result':['d-9'],
            'props':{'t':'object', 'v':{'index':{'t':'getter'}, 'cat':{'t':'object', 'v':{'id':{'t':'primitive', 'v':'OUtn3pvWmpg'}, 'name':{'t':'primitive', 'v':'Henri The Existential Cat'}}}}}},
        {'kind':'snapshotDomNodeAppended', 'parentId':'d-1', 'childIds':['d-10']},
        {'kind':'snapshotDomNodeAppended', 'parentId':'d-10', 'childIds':['d-7', 'd-8', 'd-9']}
    ];
    const logger = createDebugLog({}).logger();
    const registryMirror = createRegistryMirror(logger);
    for (const m of messages) {
        restoreMirrorFromSnapshot(registryMirror, m);
    }

    const app = registryMirror.getComponent('c-2');
    const f = registryMirror.getComponent('c-3');
    const cat1 = registryMirror.getComponent('c-4');
    const cat2 = registryMirror.getComponent('c-5');
    const cat3 = registryMirror.getComponent('c-6');

    assert.isDefined(app);
    assert.isDefined(f);
    assert.isDefined(cat1);
    assert.isDefined(cat2);
    assert.isDefined(cat3);

    assert.strictEqual(app.componentParent?.parentKind, 'domroot');
    assert.strictEqual(f.componentParent?.parentKind, 'component');
    assert.strictEqual(cat1.componentParent?.parentKind, 'component');
    assert.strictEqual(cat2.componentParent?.parentKind, 'component');
    assert.strictEqual(cat3.componentParent?.parentKind, 'component');

    const fParent = f.componentParent as ComponentParentComponent;
    const cat1Parent = cat1.componentParent as ComponentParentComponent;
    const cat2Parent = cat2.componentParent as ComponentParentComponent;
    const cat3Parent = cat3.componentParent as ComponentParentComponent;

    assert.strictEqual(cat1Parent.component.id, f.id);
    assert.strictEqual(cat2Parent.component.id, f.id);
    assert.strictEqual(cat3Parent.component.id, f.id);
    assert.strictEqual(fParent.component.id, app.id);
});
