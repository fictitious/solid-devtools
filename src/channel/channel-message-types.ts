
import type {HookType} from '../hook/hook-types';
import type {SerializedValue} from './serialized-value';

// Types for messages that go through the solid devtools channel - messages exchanged
// between the devtools agent in the page and the devtools panel.
// The way the messages go is
// agent in the solid page <-> passthrough in content script <-> passthrough in background workder <-> devtools page/panel

function message<Content = {}>(): Content[] {
    return [];
}

function messages<M extends {[n in string]: {}}>(m: M) {
    return m;
}

export interface HelloAnswer {
    hookType: HookType;
    deactivated?: boolean;  // true if 'full' hook was deactivated after devtools has disconnected
}

export interface ComponentRendered {
    id: string;
    name: string;
    props: SerializedValue;
}

export interface ComponentDisposed {
    id: string;
}

export interface DomNodeRegistered {
    id: string;
    nodeType: number;
    name?: string | null;
    value?: string | null;
}

export interface DomNodeRemoved {
    id: string;
}

export interface DomNodeAddedResultOf {
    id: string;
    resultOf: string;
    index: number[];
}

export interface DomNodeIsRoot {
    id: string;
}

export interface DomNodeRootDisposed {
    id: string;
}

export interface DomNodeAppended {
    parentId: string;
    childIds: string[];
}
export interface DomNodeInserted {
    parentId: string;
    childIds: string[];
    prevId?: string;
    nextId?: string;
}

const fromDevtools = messages({
    hello: message(),
    shutdown: message(),
    'test-message': message()
});

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
    domNodeInserted: message<DomNodeInserted>()
});

export type ChannelMessageFromDevtoolsMap = {[K in keyof typeof fromDevtools]: {category: 'solid-devtools-channel'; from: 'devtools'; kind: K} & typeof fromDevtools[K][0]};

export type ChannelMessageFromDevtools = ChannelMessageFromDevtoolsMap[keyof ChannelMessageFromDevtoolsMap];

export type ChannelMessageFromPageMap = {[K in keyof typeof fromPage]: {category: 'solid-devtools-channel'; from: 'page'; kind: K} & typeof fromPage[K][0]};

export type ChannelMessageFromPage = ChannelMessageFromPageMap[keyof ChannelMessageFromPageMap];

function messageFromDevtools<K extends keyof typeof fromDevtools>(kind: K, content: typeof fromDevtools[K][0]): ChannelMessageFromDevtoolsMap[K] {
    return Object.assign({}, {category: 'solid-devtools-channel', from: 'devtools', kind}, content) as unknown as ChannelMessageFromDevtoolsMap[K];
}

function messageFromPage<K extends keyof typeof fromPage>(kind: K, content: typeof fromPage[K][0]): ChannelMessageFromPageMap[K] {
    return Object.assign({}, {category: 'solid-devtools-channel', from: 'page', kind}, content) as unknown as ChannelMessageFromPageMap[K];
}

export type Channel<Side extends 'devtools' | 'page'> =
    Side extends 'devtools' ? {
        send<K extends keyof typeof fromDevtools>(kind: K, content: typeof fromDevtools[K][0]): void;
        addListener<K extends keyof typeof fromPage>(kind: K, listener: (msg: ChannelMessageFromPageMap[K]) => void): void;
        removeListener<K extends keyof typeof fromPage>(kind: K, listener: (msg: ChannelMessageFromPageMap[K]) => void): void;
    } : {
        send<K extends keyof typeof fromPage>(kind: K, content: typeof fromPage[K][0]): void;
        addListener<K extends keyof typeof fromDevtools>(kind: K, listener: (msg: ChannelMessageFromDevtoolsMap[K]) => void): void;
        removeListener<K extends keyof typeof fromDevtools>(m: K, listener: (msg: ChannelMessageFromDevtoolsMap[K]) => void): void;
    }
;

export {messageFromDevtools, messageFromPage};
