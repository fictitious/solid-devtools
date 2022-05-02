
import type {NodeExtraData, ComponentItemBase} from '../hook/registry/node-component-types';
import type {SerializedValue} from './channel-transport-types';

// Types for messages that go through the solid devtools channel - messages exchanged
// between the devtools agent in the page and the devtools panel.
// The way the messages go is
// agent in the solid page <-> passthrough in content script <-> passthrough in background worker <-> devtools page/panel

function message<Content = {}>(): Content[] {
    return [];
}

function messages<M extends {[n in string]: {}}>(m: M) {
    return m;
}

// devtools -> page
export interface Hello {
    devtoolsInstanceId: string;
    previousHookInstanceId?: string;
}

export interface RegistryStateAck {
    messageSerial: number;
}

export interface HighlightComponent {
    componentId: string;
}

export interface ConsoleLogSignalStack {
    signalId: string;
}

// page -> devtools

export type HookType = 'full' | 'stub';

export interface HelloAnswer {
    hookType: HookType;
    deactivated?: boolean;  // true if 'full' hook was deactivated after devtools has disconnected
    hookInstanceId: string;
    previousDevtoolsInstanceId?: string;
}

export interface RegistryStateMessageBase {
    messageSerial: number;
}
export interface ComponentRendered extends RegistryStateMessageBase {
    id: string;
    name: string;
    rawName: string;
    props: SerializedValue;
}

export interface ComponentDisposed extends RegistryStateMessageBase {
    id: string;
}

export interface DomNodeRegistered extends RegistryStateMessageBase {
    id: string;
    nodeType: number;
    name?: string | null;
    value?: string | null;
}

export interface DomNodeRemoved extends RegistryStateMessageBase {
    id: string;
}

export interface DomNodeAddedResultOf extends RegistryStateMessageBase {
    id: string;
    resultOf: string;
    index: number[];
}

export interface DomNodeIsRoot extends RegistryStateMessageBase {
    id: string;
}

export interface DomNodeRootDisposed extends RegistryStateMessageBase {
    id: string;
}

export interface DomNodeAppended extends RegistryStateMessageBase {
    parentId: string;
    childIds: string[];
}
export interface DomNodeInserted extends RegistryStateMessageBase {
    parentId: string;
    childIds: string[];
    prevId?: string;
    nextId?: string;
}

export interface SignalCreated extends RegistryStateMessageBase {
    signalId: string;
    ownerId?: string;
    componentId?: string;
    name?: string;
    value: SerializedValue;
}

export interface SignalUpdated extends RegistryStateMessageBase {
    signalId: string;
    ownerId?: string;
    componentId?: string;
    value: SerializedValue;
}

export interface SignalDisposed extends RegistryStateMessageBase {
    signalId: string;
    ownerId?: string;
    componentId?: string;
}

export interface InspectComponentSelected {
    componentId: string;
}

export type SnapshotDomNode = Omit<DomNodeRegistered, 'messageSerial'> & NodeExtraData;

export type SnapshotComponent = Omit<ComponentItemBase, 'props'> & {props: SerializedValue};

export type SnapshotDomNodeAppended = Omit<DomNodeAppended, 'messageSerial'>;

export type SnapshotSignal = Omit<SignalCreated, 'messageSerial'>;

const fromDevtools = messages({
    hello: message<Hello>(),
    devtoolsDisconnect: message(),
    registryStateAck: message<RegistryStateAck>(),
    highlightComponent: message<HighlightComponent>(),
    stopHighlightComponent: message(),
    startInspectingElements: message(),
    stopInspectingElements: message(),
    consoleLogRegistry: message(),
    consoleLogSignalStack: message<ConsoleLogSignalStack>()
});
export type FromDevtools = typeof fromDevtools;

const fromPage = messages({
    helloAnswer: message<HelloAnswer>(),
    componentRendered: message<ComponentRendered>(),
    componentDisposed: message<ComponentDisposed>(),
    domNodeRegistered: message<DomNodeRegistered>(),
    domNodeRemoved: message<DomNodeRemoved>(),
    domNodeAddedResultOf: message<DomNodeAddedResultOf>(),
    domNodeIsRoot: message<DomNodeIsRoot>(),
    domNodeRootDisposed: message<DomNodeRootDisposed>(),
    domNodeAppended: message<DomNodeAppended>(),
    domNodeInserted: message<DomNodeInserted>(),
    signalCreated: message<SignalCreated>(),
    signalUpdated: message<SignalUpdated>(),
    signalDisposed: message<SignalDisposed>(),
    inspectComponentSelected: message<InspectComponentSelected>(),
    inspectComponentEnded: message(),
    snapshotDomNode: message<SnapshotDomNode>(),
    snapshotComponent: message<SnapshotComponent>(),
    snapshotDomNodeAppended: message<SnapshotDomNodeAppended>(),
    snapshotSignal: message<SnapshotSignal>(),
    snapshotCompleted: message()
});
export type FromPage = typeof fromPage;

export type ChannelMessageFromDevtoolsMap = {[K in keyof FromDevtools]: {category: 'solid-devtools-channel'; from: 'devtools'; kind: K} & FromDevtools[K][0]};

export type ChannelMessageFromDevtools = ChannelMessageFromDevtoolsMap[keyof ChannelMessageFromDevtoolsMap];

export type ChannelMessageFromPageMap = {[K in keyof FromPage]: {category: 'solid-devtools-channel'; from: 'page'; kind: K} & FromPage[K][0]};

export type ChannelMessageFromPage = ChannelMessageFromPageMap[keyof ChannelMessageFromPageMap];

function messageFromDevtools<K extends keyof FromDevtools>(kind: K, content: FromDevtools[K][0]): ChannelMessageFromDevtoolsMap[K] {
    return Object.assign({}, {category: 'solid-devtools-channel', from: 'devtools', kind}, content) as unknown as ChannelMessageFromDevtoolsMap[K];
}

function messageFromPage<K extends keyof FromPage>(kind: K, content: FromPage[K][0]): ChannelMessageFromPageMap[K] {
    return Object.assign({}, {category: 'solid-devtools-channel', from: 'page', kind}, content) as unknown as ChannelMessageFromPageMap[K];
}

const registryStateMessageNames = [
    'componentRendered', 'componentDisposed',
    'domNodeRegistered', 'domNodeRemoved', 'domNodeAddedResultOf', 'domNodeIsRoot', 'domNodeRootDisposed', 'domNodeAppended', 'domNodeInserted',
    'signalCreated', 'signalUpdated', 'signalDisposed'
] as const;

export type RegistryStateMessageNames = typeof registryStateMessageNames[number];

export type RegistryStateMessageMap = {[K in RegistryStateMessageNames]: FromPage[K][0]};
export type RegistryStateMessage = RegistryStateMessageMap[keyof RegistryStateMessageMap];

export type RegistryStateMessageWithKindMap = {[K in RegistryStateMessageNames]: {kind: K} & FromPage[K][0]};
export type RegistryStateMessageWithKind = RegistryStateMessageWithKindMap[keyof RegistryStateMessageWithKindMap];

export type RegistryStateMessageNoSerialMap = {[K in RegistryStateMessageNames]: Omit<FromPage[K][0], 'messageSerial'>};
export type RegistryStateMessageNoSerial = RegistryStateMessageNoSerialMap[keyof RegistryStateMessageNoSerialMap];

const registrySnapshotMessageNames = ['snapshotDomNode', 'snapshotComponent', 'snapshotDomNodeAppended', 'snapshotSignal', 'snapshotCompleted'] as const;

export type RegistrySnapshotMessageNames = typeof registrySnapshotMessageNames[number];

export type RegistrySnapshotMessageMap = {[K in RegistrySnapshotMessageNames]: FromPage[K][0]};
export type RegistrySnapshotMessage = RegistrySnapshotMessageMap[keyof RegistrySnapshotMessageMap];

export type RegistrySnapshotMessageWithKindMap = {[K in RegistrySnapshotMessageNames]: {kind: K} & FromPage[K][0]};
export type RegistrySnapshotMessageWithKind = RegistrySnapshotMessageWithKindMap[keyof RegistrySnapshotMessageWithKindMap];

export {messageFromDevtools, messageFromPage, registryStateMessageNames, registrySnapshotMessageNames};
