import * as cluster from 'cluster';

export interface ProcessMessage<T> {
    event: string;
    pid: number;
    content: T;
}


export class ProcessMessageHandler {

    constructor() {
        process.on('message', (message) => {});
    }

}


