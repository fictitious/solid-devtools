
import type {Component} from 'solid-js';

import type {Channel} from '../channel/channel-message-types';
import type {SolidInstance} from './wrappers/types';

export type HookComponentWrapper = (c: Component) => Component;
export type HookInsertParentWrapper = (p: Node) => {};
export type HookRegisterRoot = (r: Node) => () => void;


export interface HookBase {
    hookType: 'full' | 'stub';
    solidInstance?: SolidInstance;
    channel: Channel<'page'>;
    deactivated?: boolean;
    registerSolidInstance(solidInstance: SolidInstance): void;
    connectChannel(): void;
    getComponentWrapper(updateWrapper: (newWrapper: HookComponentWrapper) => void): HookComponentWrapper;
    getInsertParentWrapper(updateWrapper: (newWrapper: HookInsertParentWrapper) => void): HookInsertParentWrapper;
    getRegisterRoot(updateRegisterRoot: (newRegisterRoot: HookRegisterRoot) => void): HookRegisterRoot;
}

// hook to inject into the page when solid devtools panel is not open
export interface HookStub extends HookBase {
    hookType: 'stub';
}

// hook to inject into the page when solid devtools panel is open
export interface HookFull extends HookBase {
    hookType: 'full';
}

export type HookType = HookBase['hookType'];

