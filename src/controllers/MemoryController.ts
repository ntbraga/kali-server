import { Controller, RequestMethod, RequestMapping } from './../lib/decorators/server';
import { HttpStatus } from '../lib/main/http';
import { Inject, Persistence } from '../lib/decorators/injection';
import { MemoryHelper } from './../helpers/MemoryHelper';
import { Connection } from 'typeorm';

@Controller({
    path: ['/system'],
    method: RequestMethod.GET,
    errorCode: HttpStatus.BAD_REQUEST,
    authenticated: false
})
export class MemoryController {

    @Inject()
    memory: MemoryHelper;

    @Persistence()
    connection: Connection;

    @RequestMapping()
    getSystem() {
        return Promise.resolve({
            memory: this.memory.getMemoryUsage(),
            rawMemory: this.memory.getMemoryUsageRaw(),
            process: {
                uptime: process.uptime(),
                pid: process.pid,
                arch: process.arch,
                platform: process.platform,
                debug: process.debugPort,
            },
            node: {
                version: process.version,
                versions: process.versions
            },
            database: this.connection.options
        });
    }

}