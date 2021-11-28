
import type {HookType} from '../hook/hook-types';

// Types for messages that go through the solid devtools channel - messages exchanged
// between the devtools agent in the page and the devtools panel.
// The way the messages go is
// agent in the solid page <-> relay in content script <-> relay in background workder <-> devtools page/panel

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

const fromDevtools = messages({
    hello: message(),
    shutdown: message(),
    'test-message': message()
});

const fromPage = messages({
    helloAnswer: message<HelloAnswer>()
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
