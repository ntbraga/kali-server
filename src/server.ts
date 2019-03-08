import { DataController } from './controllers/DataController';
import { DataHelper } from './helpers/DataHelper';
import { Server } from './lib/decorators/server';
import { Init } from './lib/lifecycle/Init';
import * as bodyParser from 'body-parser';
import * as fileupload from 'express-fileupload';
import { AuthServiceImpl } from './services/AuthService';
import { MemoryController } from './controllers/MemoryController';
import { MemoryHelper } from './helpers/MemoryHelper';
import { DefaultEnv } from './env/env.def';

@Server({
    sessionOptions: {
        secret: 'teste',
        resave: false,
        saveUninitialized: true
    },
    controllers: [
        DataController,
        MemoryController
    ],
    helpers: [
        DataHelper,
        MemoryHelper
    ],
    use: [
        fileupload(),
        bodyParser.json(),
        bodyParser.urlencoded({ extended: true })
    ],
    auth: {
        path: '/auth',
        authService: AuthServiceImpl
    },
    environments: {
        def: DefaultEnv,
        test: DefaultEnv
    }
})
export class AppServer implements Init {

    onInit() {

    }

}
