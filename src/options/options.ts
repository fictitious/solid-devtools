
export interface Options {
    exposeDomNodeIds?: boolean;
    showLogPanel?: boolean;
    logAllMessages?: boolean;
}

function loadOptions(): Promise<Options> {
    return chrome.storage.sync.get(null) as Promise<Options>;
}

async function saveOptions(options: Partial<Options>): Promise<void> {
    const stored = await (chrome.storage.sync.get(null) as Promise<Options>);
    return chrome.storage.sync.set(Object.assign(stored || {}, options));
}

export {loadOptions, saveOptions};
