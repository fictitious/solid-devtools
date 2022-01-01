
import type {Hello, HelloAnswer} from './channel-message-types';

function canReconnect(hello: Hello, helloAnswer: HelloAnswer): boolean {
    return hello.previousHookInstanceId !== undefined && helloAnswer.previousDevtoolsInstanceId !== undefined
        && hello.previousHookInstanceId === helloAnswer.hookInstanceId
        && helloAnswer.previousDevtoolsInstanceId === hello.devtoolsInstanceId
    ;
}

export {canReconnect};
