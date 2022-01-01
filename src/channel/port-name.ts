
interface DecodedPortName {
    tabId: number;
    devtoolsInstanceId: string;
    previousHookInstanceId?: string;
}

// this relies on nanoid default alphabet not containing ':'

function encodePortName({tabId, devtoolsInstanceId, previousHookInstanceId}: DecodedPortName): string {
    return `${tabId}:${devtoolsInstanceId}:${previousHookInstanceId ?? ''}`;
}

function decodePortName(portName: string | undefined): DecodedPortName | undefined {
    const parts = portName && portName.split(':');
    if (parts?.length === 3 && isNumericEnough(parts[0])) {
        return {
            tabId: +parts[0],
            devtoolsInstanceId: parts[1],
            previousHookInstanceId: parts[2] || undefined
        };
    } else {
        return undefined;
    }
}

// not exactly isNumeric but good enough for tab ids
function isNumericEnough(str: string): boolean {
    return `${+str}` === str;
}

export {encodePortName, decodePortName};
