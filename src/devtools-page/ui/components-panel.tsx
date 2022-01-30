import type {Component} from 'solid-js';
import {createSignal, createEffect, onMount, Show, Switch, Match, For} from 'solid-js';


import type {ConnectionState} from '../connection/connection-state-types';
import type {RootsData} from '../data/component-data-types';
import type {RegistryMirror} from '../registry-mirror/registry-mirror-types';
import {LOCAL_STORAGE_DEVTOOLS_COMPONENTS_PANEL_RESIZE_KEY} from '../storage-keys';
import {RootUI} from './component';
import {ChannelContext} from './channel-context';
import {buttonClass} from './common-styles';

interface ComponentsPanelProps {
    connectionState: ConnectionState;
    rootsData: RootsData;
    registryMirror: RegistryMirror;
}

const TimeoutMessage: Component = () => {
    const [visible, setVisible] = createSignal(false);
    const timeoutSeconds = 8;
    createEffect(() => setTimeout(() => setVisible(true), timeoutSeconds * 1000));
    return <Show when={visible()}><p>Seems like something went wrong. Try to close the browser window and open again.</p></Show>;
};

const connectionStateClass = 'pt-3 pl-3 text-sm leading-normal';

const ConnectionStateSwitch: Component<{connectionState: ConnectionState}> = props => {
    const reload = () => chrome.devtools.inspectedWindow.reload({});
    return <Switch>
        <Match when={props.connectionState.hookType() === 'stub'}>
            <div class={connectionStateClass}>
                <p>The page was loaded while Solid devtools were not active.</p>
                <p>Solid does not create data structures necessary for visualizing the component tree while the devtools window is not shown.</p>
                <p>Click <button onclick={reload} class={buttonClass}>Reload</button> to reload the page</p>
            </div>
        </Match>
        <Match when={props.connectionState.channelState() === 'disconnected'}>
            <div class={connectionStateClass}>
                <p>Solid devtools has disconnected from the page.</p>
                <p>Please close devtools and open again to reconnect.</p>
            </div>
        </Match>
        <Match when={props.connectionState.channelState() === 'connected-incapable'}>
            <div class={connectionStateClass}>
                <p>The page was updated while Solid devtools were not active.</p>
                <p>Solid does not maintain data structures necessary for visualizing the component tree while the devtools window is not shown.</p>
                <p>Click <button onclick={reload} class={buttonClass}>Reload</button> to reload the page.</p>
            </div>
        </Match>
        <Match when={props.connectionState.channelState() === 'connecting'}>
            <div class={connectionStateClass}>
                <p>connecting...</p>
                <TimeoutMessage />
            </div>
        </Match>
        <Match when={props.connectionState.channelState() === 'connected'}>
            <ChannelContext.Provider value={props.connectionState.channel()}>
                {props.children}
            </ChannelContext.Provider>
        </Match>
    </Switch>;
};

const ComponentsPanel: Component<ComponentsPanelProps> = props => {
    const SM_MIN_WIDTH_PIXELS = 640; // sm tailwindcss breakpoint
    const MIN_SIZE_PIXELS = 50; // min width/height for tree/props panels
    let outerContainer!: HTMLDivElement;
    let treeContainer!: HTMLDivElement;
    const [resizing, setResizing] = createSignal(false);

    const ratios = loadResizeRatios() ?? {
        horizontal: 2/3, // the counterpart initial size is basis-1/3 for horizontal
        vertical: 1/2 // and basis-1/2 for vertical
    };
    const setTreeSizeRatio = (orientation: 'horizontal' | 'vertical') => {
        treeContainer.style.setProperty(`--${orientation}-resize-percent`, `${ratios[orientation] * 100}%`);
    };
    onMount(() => {
        setTreeSizeRatio('horizontal');
        setTreeSizeRatio('vertical');
    });

    let initial: {mousePos: number; treeSize: number} | undefined = undefined;
    const onMouseMove = (event: MouseEvent) => {
        event.preventDefault();
        const {width: outerWidth, height: outerHeight} = outerContainer.getBoundingClientRect();
        const orientation = outerWidth >= SM_MIN_WIDTH_PIXELS ? 'horizontal' : 'vertical';
        if (!initial) {
            const {width: treeWidth, height: treeHeight} = treeContainer.getBoundingClientRect();
            initial = orientation === 'horizontal' ? {mousePos: event.clientX, treeSize: treeWidth} : {mousePos: event.clientY, treeSize: treeHeight};
        }
        const currentMousePos = orientation === 'horizontal' ? event.clientX : event.clientY;
        const outerSize = orientation === 'horizontal' ? outerWidth : outerHeight;
        const newSize = initial.treeSize + (currentMousePos - initial.mousePos);
        const maxSize = outerSize - MIN_SIZE_PIXELS;
        if (newSize > MIN_SIZE_PIXELS && newSize < maxSize) {
            ratios[orientation] = newSize / outerSize;
            setTreeSizeRatio(orientation);
        }
    };
    const stopResizing = () => setResizing(false);

    createEffect(() => {
        if (resizing()) {
            outerContainer.addEventListener('mousemove', onMouseMove);
            outerContainer.addEventListener('mouseup', stopResizing);
        } else {
            outerContainer.removeEventListener('mousemove', onMouseMove);
            outerContainer.removeEventListener('mouseup', stopResizing);
            initial = undefined;
            saveResizeRatios(ratios);
        }
    });

    return <div ref={outerContainer} classList={{'text-sm': true, 'h-full': true, 'w-full': true, 'flex': true, 'sm:flex-row': true, 'flex-col': true, 'sm:cursor-ew-resize': resizing(), 'cursor-ns-resize': resizing()}}>
        <ConnectionStateSwitch connectionState={props.connectionState}>
            <div ref={treeContainer} class="overflow-auto grow-0 shrink-0 sm:[flex-basis:var(--horizontal-resize-percent)] [flex-basis:var(--vertical-resize-percent)] overflow-auto">
                <div class="h-full w-full flex flex-col">
                    <div class="w-full flex-none flex flex-row py-1">
                        <div class="py-0.5 mx-3 px-3 border border-blue-400">Placeholder</div>
                    </div>
                    <div class="flex-auto w-full overflow-auto text-xs leading-snug">
                        <For each={props.rootsData.roots()}>{root =>
                            <RootUI {...{...root}} />
                        }</For>
                    </div>
                </div>
            </div>

            <div class="grow-0 shrink-0 basis-0 relative">
                <div onMouseDown={[setResizing, true]} class="absolute sm:h-full h-[5px] sm:w-[5px] w-full sm:-left-[2px] sm:top-0 -top-[2px] sm:cursor-ew-resize cursor-ns-resize"></div>
            </div>

            <div class="overflow-auto grow shrink sm:basis-1/3 basis:1/2 sm:border-l sm:border-t-0 border-t">
            </div>
        </ConnectionStateSwitch>
    </div>;
};

function saveResizeRatios(ratios: {}): void {
    localStorage.setItem(LOCAL_STORAGE_DEVTOOLS_COMPONENTS_PANEL_RESIZE_KEY, JSON.stringify(ratios));
}

function loadResizeRatios(): {horizontal: number; vertical: number} | undefined {
    const data = localStorage.getItem(LOCAL_STORAGE_DEVTOOLS_COMPONENTS_PANEL_RESIZE_KEY);
    let result: {horizontal: number; vertical: number} | undefined;
    if (data) {
        try {
            result = JSON.parse(data) as typeof result;
        } catch (e) {
            // ignore - the caller will use defaults
        }
    }
    return result;
}

export {ComponentsPanel};
