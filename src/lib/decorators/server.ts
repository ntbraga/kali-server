import 'reflect-metadata';
import { Express, IRoute, Request, Response, NextFunction, RequestHandler, Router } from 'express';
import { exportEnvironments, CommandLine } from '../command/commands';
import { Type, TypeDecorator, TypedMethodDecorator, PromiseMethod } from '../main';
import { createConnection, Connection } from 'typeorm';
import { Map, HashMap, ConditionalExecutor, MapObject } from './../map/map';
import { addToInjectionChain, processInjectionChain, getFromInjectionChain } from './injection';
import { ScheduleAll } from './cron';
import { HttpStatus, HttpError } from '../main/http';
import { ServerOptions } from './server';
import * as express from 'express';
import { AuthService } from '../auth/authentication';
import * as addRequestId from 'express-request-id';
import * as session from 'express-session';
import * as cluster from 'cluster';
import * as os from 'os';
import { Worker } from 'cluster'; 
import { Environment } from 'lib/command/commands';

export interface MappingParameter {
    index: number,
    path: string[],
    type: Type<any>,
    decorator: string
}

export interface MappingMetadata {
    options?: RequestOptions<string>,
    property: string,
    returnType?: Type<any>,
    returnTypeName?: string,
    parameters: MappingParameter[]
}

export interface ControllerMetadata<T> {
    type?: Type<T>,
    app?: Router,
    options?: RequestOptions<string[] | string>,
    mappings: Map<MappingMetadata>,
    params: Map<MappingMetadata>
}

export interface AuthOptions {
    path?: string;
    authService: Type<AuthService<any, any>>;
}

export interface ClusterOptions {
    enabled: boolean;
    lenght?: number;
}

export const ServerMetadata: Map<ControllerMetadata<any>> = new HashMap<ControllerMetadata<any>>();

export interface ServerOptions {
    sessionOptions: session.SessionOptions;
    controllers?: Type<any>[];
    helpers?: Type<any>[];
    use?: RequestHandler[];
    auth?: AuthOptions;
    cluster?: ClusterOptions;
    environments: MapObject<Environment>;
}

export enum RequestMethod {
    GET = 'GET',
    POST = 'POST',
    DELETE = 'DELETE',
    PUT = 'PUT',
    ALL = 'ALL'
}

export interface RequestOptions<T> {
    path?: T,
    method?: RequestMethod,
    errorCode?: HttpStatus,
    errorMessage?: string,
    authenticated?: boolean
}

const getDefaultOptions = <T>(path: T): RequestOptions<T> => ({
    path: path,
    method: RequestMethod.GET,
    errorCode: 500,
    authenticated: true
});

function paramDecoratorator<T>(decorator: string, ...path: string[]) {
    return (target: Object, propertyKey: string, parameterIndex: number) => {
        const target_name = target.constructor.name;
        const type = Reflect.getMetadata('design:paramtypes', target, propertyKey)[parameterIndex];
        ServerMetadata.changeWithDefault(target_name, { mappings: new HashMap<MappingMetadata>(), params: new HashMap<MappingMetadata>() }, (value) => {
            value.mappings.changeWithDefault(propertyKey, {
                property: propertyKey,
                parameters: []
            }, (prop) => {

                prop.parameters.push({
                    index: parameterIndex,
                    path: path,
                    type: type,
                    decorator: decorator
                });

                return prop;
            });

            return value;
        });
    };
}

// { req, res}

export function HttpRequest(): ParameterDecorator {
    return paramDecoratorator('HttpRequest', 'req');
}

export function HttpResponse(): ParameterDecorator {
    return paramDecoratorator('HttpResponse', 'res');
}

export function RequestParam<T>(name: string): ParameterDecorator {
    return paramDecoratorator('RequestParam', 'req', 'query', name);
}

export function PathVariable<T>(name: string): ParameterDecorator {
    return paramDecoratorator('PathVariable', 'req', 'params', name);
}

export function RequestBody<T>(): ParameterDecorator {
    return paramDecoratorator('RequestBody', 'req', 'body');
}

export function Server(options: ServerOptions): TypeDecorator {
    return (target: Type<any>) => {
        exportEnvironments(options.environments);
        if(CommandLine.cluster == undefined && options.cluster != undefined) {
            CommandLine.cluster = options.cluster.enabled;
        }

        if(CommandLine.cluster == true) {
            if(options.cluster == undefined) {
                options.cluster = { enabled: CommandLine.cluster == true || CommandLine.cluster != undefined };
            }

            options.cluster.enabled = true;

            if(CommandLine.clusterSize == true) {
                options.cluster.lenght = undefined;
            } else if(!isNaN(<number>CommandLine.clusterSize)) {
                options.cluster.lenght = Number(CommandLine.clusterSize);
            }
        }

        addToInjectionChain(target);
        ConditionalExecutor.create(() => {
            if (options.cluster == undefined || (options.cluster != undefined && !options.cluster.enabled)) {
                createServerAndListen(options).then(() => {
                    ScheduleAll();
                    console.log(`Listening to ${CommandLine.port}`);
                });
            } else {
                ConditionalExecutor.create(() => {
                    const cpus = Math.max(2, options.cluster.lenght == undefined ? os.cpus().length : options.cluster.lenght);
                    const workers = forkClusters(cpus, (worker) => {
                        worker.send({});
                        worker.on('message', (created) => {
                            console.log(created, process.pid);
                        })
                    });
                    console.log(`Created ${workers.length} workers.`);
                    ScheduleAll();
                    cluster.on('exit', (worker, code, signal) => {
                        console.log(`worker ${worker.process.pid} died`);
                    });
                }).doIf(() => cluster.isMaster && options.cluster != undefined && options.cluster.enabled).execute();
            }
        }).doIf(() => cluster.isMaster).execute();

        ConditionalExecutor.create(() => {
            process.on('message', (create) => {
                createServerAndListen(options).then(() => {
                    process.send({ node: process.pid, on: new Date() });
                });
            });
        }).doIf(() => cluster.isWorker).execute();

        return target;
    }
}

function forkClusters(qtd: number, each: (worker) => void): Worker[] {
    const workers: Worker[] = [];
    for (let i = 0; i < qtd; i++) {
        const worker = cluster.fork();
        each(worker);
        workers.push(worker);
    }
    return workers;
}


function createServerAndListen(options: ServerOptions) {
    return new Promise((resolve, reject) => {
        connect().then((connection) => {
            processInjectionChain();
            const auth: AuthOptions = options.auth;
            const AppServer: Express = express();
            AppServer.use([session(options.sessionOptions), addRequestId()]);
            AppServer.use(options.use || []);

            let authService;
            if (auth != undefined) {
                authService = getFromInjectionChain(auth.authService);
                AppServer.use(auth.path || '/auth', getAuthRouter(authService));
            }

            ServerMetadata.forEachAsync((key, value) => {
                value.app = Router({ mergeParams: true });
                value.mappings.forEach((key, map) => {
                    handleMapping(value, map, authService);
                });
                AppServer.use(value.options.path, value.app);
            }).then(() => {
                AppServer.listen(CommandLine.port, () => {
                    resolve();
                });
            });

        }).catch((err) => {
            console.log('Erro ao conectar ao banco de dados.');
            console.error(err);
        });
    })
}

export function Controller(options?: RequestOptions<string[]>): TypeDecorator {
    return (target: Type<any>) => {
        const target_name = target.name;
        addToInjectionChain(target);
        ServerMetadata.changeWithDefault(target_name, { mappings: new HashMap<MappingMetadata>(), params: new HashMap<MappingMetadata>() }, (value) => {
            value.options = Object.assign(getDefaultOptions(['/']), options);
            value.type = target;
            return value;
        });

        return target;
    }
}

export function ParameterParser(...name: string[]): TypedMethodDecorator<PromiseMethod> {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<PromiseMethod>) => {
        const target_name = target.constructor.name;
        ServerMetadata.changeWithDefault(target_name, { mappings: new HashMap<MappingMetadata>(), params: new HashMap<MappingMetadata>() }, (value) => {

            name.forEach((key) => {
                value.params.put(key, {
                    property: propertyKey,
                    parameters: []
                });
            })

            return value;
        });
        return descriptor;
    };
}

export function RequestMapping(options?: RequestOptions<string>): MethodDecorator {
    return <T>(target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<T>) => {
        const target_name = target.constructor.name;
        const returnType = Reflect.getMetadata('design:returntype', target, propertyKey);
        ServerMetadata.changeWithDefault(target_name, { mappings: new HashMap<MappingMetadata>(), params: new HashMap<MappingMetadata>() }, (value) => {
            value.mappings.changeWithDefault(propertyKey, {
                property: propertyKey,
                parameters: []
            }, (propValue) => {
                propValue.property = propertyKey;
                propValue.options = Object.assign({ path: '' }, options);
                propValue.returnType = returnType;
                propValue.returnTypeName = returnType != undefined ? returnType.prototype.constructor.name : undefined;
                return propValue;
            });
            return value;
        });
        return descriptor;
    };
}

function getAuthRouter(service: AuthService<any, any>) {
    const authRouter = Router({ mergeParams: true });

    authRouter.post('/login', (req, res, next) => {
        service.login(req, res, next);
    });

    authRouter.get('/logout', (req, res, next) => {
        service.logout(req, res, next)
    });

    return authRouter;
}

function handleMapping<T>(controllerMeta: ControllerMetadata<T>, meta: MappingMetadata, authService: AuthService<any, any>) {
    const options = Object.assign(Object.assign({}, controllerMeta.options, { path: '' }), meta.options);
    options.path = options.path == '' || options.path == undefined ? '/' : options.path;
    getExpressMatchingMethod(controllerMeta.app.route(options.path), options.method, (req: Request, res: Response, next: NextFunction) => {

        if (options.authenticated && authService != undefined && req.session.user == undefined) {
            return res.status(HttpStatus.UNAUTHORIZED).send(authService.onError(undefined, { status: HttpStatus.UNAUTHORIZED }));
        }

        const instance = getFromInjectionChain(controllerMeta.type);

        const method = instance[meta.property];
        const parameters = meta.parameters;
        let promiseArr = [];
        Object.keys(req.params).forEach((name) => {
            controllerMeta.params.get(name).ifPresent((metaParam) => {
                const paramMethod = instance[metaParam.property];
                promiseArr.push(paramMethod.apply(instance, [req.params[name], name]).then((nValue) => {
                    req.params[name] = nValue;
                    return nValue;
                }));
            });
        });

        if (promiseArr.length == 0) {
            promiseArr = [Promise.resolve({})];
        }

        return Promise.all(promiseArr).then((result) => {

            const args = parameters.sort((v1, v2) => {
                return v1.index - v2.index
            }).map((param) => {
                let value = param.path.reduce(
                    (pv, cv) => {
                        if (pv != undefined) {
                            return pv[cv];
                        }
                        return undefined;
                    },
                    {
                        req: req,
                        res: res
                    }
                );

                if (param.decorator == 'RequestBody') {
                    return Object.assign(new param.type(), value);
                }

                return value;
            });

            const value = method.apply(instance, args);

            if (meta.returnTypeName == undefined) {
                meta.returnTypeName = value.constructor.name;
            }

            switch (meta.returnTypeName) {
                case 'Observable': {
                    value.subscribe((value) => {
                        res.json(value);
                    });
                    break;
                }
                case 'Promise': {
                    value.then((value) => {
                        res.json(value);
                    }).catch((err) => {
                        const status = err.status != undefined ? err.status : (options.errorCode != undefined ? options.errorCode : 500);
                        const error = new HttpError(status, options.errorMessage || err.message, err);
                        res.status(status).send(error);
                    });
                    break;
                }
                default: {
                    res.json(value);
                    return;
                }
            }
        }).catch((err) => {
            console.error(err);
            res.status(err.status != undefined ? err.status : 500).send(err);
        });

    });
};

function getExpressMatchingMethod<T>(route: IRoute, method: RequestMethod, ...handlers: RequestHandler[]): IRoute {
    switch (method) {
        case RequestMethod.GET: return route.get(handlers);
        case RequestMethod.POST: return route.post(handlers);
        case RequestMethod.PUT: return route.put(handlers);
        case RequestMethod.DELETE: return route.delete(handlers);
        case RequestMethod.ALL: return route.all(handlers);
        default: return route.get(handlers);
    }
}

function connect(): Promise<Connection> {
    return createConnection(CommandLine.connection);
}