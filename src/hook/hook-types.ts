
import type {Component} from 'solid-js';

import type {SolidInstance} from './registry/node-component-types';
import type {Hello, HelloAnswer} from '../channel/channel-message-types';

export type HookComponentWrapper = (c: Component) => Component;
export type HookInsertParentWrapper = (p: Node) => {};
export type HookRegisterRoot = (r: Node) => () => void;

export interface Hook {
    solidInstance?: SolidInstance;
    registerSolidInstance(solidInstance: SolidInstance): void;
    connectChannel(m: Hello): HelloAnswer;
    getComponentWrapper(updateWrapper: (newWrapper: HookComponentWrapper) => void): HookComponentWrapper;
    getInsertParentWrapper(updateWrapper: (newWrapper: HookInsertParentWrapper) => void): HookInsertParentWrapper;
    getRegisterRoot(updateRegisterRoot: (newRegisterRoot: HookRegisterRoot) => void): HookRegisterRoot;
}
