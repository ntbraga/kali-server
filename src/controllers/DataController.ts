import { Controller, RequestMapping, RequestMethod, PathVariable, ParameterParser, RequestBody } from '../lib/decorators/server';
import { Init } from 'lib/lifecycle/Init';
import { Inject, InjectRepository } from '../lib/decorators/injection';
import { DataHelper } from '../helpers/DataHelper';
import { HttpRequest } from '../lib/decorators/server';
import { Repository } from 'typeorm';
import { Task } from '../lib/decorators/cron';
import { User } from './../entity/User';
import { HttpStatus } from '../lib/main/http';

@Controller({
    path: ['/data/:database'],
    method: RequestMethod.GET,
    errorCode: HttpStatus.BAD_REQUEST
})
export class DataController implements Init {

    @Inject()
    dataHelper: DataHelper;

    @InjectRepository(User)
    userRepo: Repository<User>;

    @ParameterParser('database')
    getDatabase(value: string): Promise<Repository<any>> {
        if (this.dataHelper.hasMetadata(value)) {
            return Promise.resolve(this.dataHelper.getRepository(value));
        } else {
            return Promise.reject({ message: `Database "${value}" not found.` });
        }
    }

    @ParameterParser('id')
    getId(value: any): Promise<Number> {
        if (!isNaN(value)) {
            return Promise.resolve(Number(value));
        }
        return Promise.reject({ message: `"${value}" is not a number.` });
    }

    @RequestMapping()
    get(@HttpRequest() request, @PathVariable('database') database: Repository<any>): Promise<any> {
        return database.find();
    }

    @RequestMapping({
        path: '/metadata'
    })
    getMetadata(@PathVariable('database') database: Repository<any>) {
        return database.metadata.propertiesMap;
    }

    @RequestMapping({
        path: '/:id',
        errorCode: HttpStatus.NOT_FOUND,
        errorMessage: 'Dados não encontrados.'
    })
    getById(@PathVariable('database') database: Repository<any>, @PathVariable('id') id: number): Promise<any> {
        return database.findOneOrFail(id);
    }

    @RequestMapping({
        method: RequestMethod.POST
    })
    save(@PathVariable('database') database: Repository<any>, @RequestBody() body): Promise<any> {
        return database.save(body);
    }

    onInit() {

    }

    @Task({
        second: {
            every: 2
        },
        minute: '*',
        hour: '*',
        day: '*',
        month: '*',
        weekDay: '*'
    })
    execute() {
        return {};
    }
}