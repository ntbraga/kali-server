
import { TypeDecorator, Type } from 'lib/main';
import { Map, HashMap } from './../map/map';
import { onInit } from './../main/index';
import { getConnectionManager } from 'typeorm';

const InjectionChain: Map<any> = new HashMap<any>();
const InjectionMetadata: Map<InjectMetadata> = new HashMap<InjectMetadata>();

export function getInjectionChain() {
    return InjectionChain;
}

export function getInjectionMetadata() {
    return InjectionMetadata;
}

interface InjectPropMetadata {
    property: string,
    typeName: string,
    type: InjectionType,
    data: any
}

export interface InjectMetadata {
    injections: InjectPropMetadata[]
}

export enum InjectionType {
    INJECT = 'INJECT',
    REPOSITORY = 'REPOSITORY',
    PERSISTENCE = 'PERSISTENCE'
}

export function InjectRepository(name: string | Type<any>, database = 'default'): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        const target_name = target.constructor.name;
        const type = Reflect.getMetadata("design:type", target, propertyKey);
        InjectionMetadata.changeWithDefault(target_name, { injections: [] }, (value) => {

            value.injections.push({
                property: propertyKey,
                typeName: type != undefined ? type.name : undefined,
                type: InjectionType.REPOSITORY,
                data: {
                    database: database,
                    name: name
                }
            });

            return value;
        });
    };
}


export function Inject(): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        const target_name = target.constructor.name;
        const type = Reflect.getMetadata("design:type", target, propertyKey);
        InjectionMetadata.changeWithDefault(target_name, { injections: [] }, (value) => {
            value.injections.push({
                property: propertyKey,
                typeName: type != undefined ? type.name : undefined,
                type: InjectionType.INJECT,
                data: {}
            });
            return value;
        });
    };
}

export function Persistence(name = 'default'): PropertyDecorator {
    return (target: any, propertyKey: string) => {
        const target_name = target.constructor.name;
        const type = Reflect.getMetadata("design:type", target, propertyKey);

        InjectionMetadata.changeWithDefault(target_name, { injections: [] }, (value) => {

            value.injections.push({
                property: propertyKey,
                typeName: type.name,
                type: InjectionType.PERSISTENCE,
                data: {
                    name: name
                }
            });

            return value;
        });
    }
}

export function Helper(): TypeDecorator {
    return (target: Type<any>) => {
        addToInjectionChain(target);
        return target;
    }
}

export function EnableInjection(create?: boolean): ClassDecorator {
    return (target: any) => {
        const Original = target;
        let decoratedConstructor: any = function (...args: any[]): void {
            return addToInjectionChain(Original, args);
        };
        decoratedConstructor.prototype = Original.prototype;
        Object.keys(Original).forEach((name: string) => { decoratedConstructor[name] = (<any>Original)[name]; });

        if (create === true) {
            addToInjectionChain(decoratedConstructor);
        }

        return decoratedConstructor;
    }
}

function getOrCreateInstance<T>(type: Type<T>, ...args: any[]): T {
    return InjectionChain.get(type.name).getOrDefault(new type());
}

export function addToInjectionChain<T>(type: Type<T>, ...args: any[]) {
    InjectionChain.put(type.name, getOrCreateInstance(type, ...args));
}

export function getFromInjectionChainByName<T>(name: string): T {
    return InjectionChain.get(name).get();
}

export function getFromInjectionChain<T>(type: Type<T>): T {
    return getFromInjectionChainByName(type.name);
}

export function processInjectionChain() {
    InjectionChain.forEachKey((key) => {
        InjectionChain.change(key, (value) => {
            const target_name = value.constructor.name;
            InjectionMetadata.get(target_name).ifPresent((meta) => {
                meta.injections.forEach((inject) => {
                    Object.defineProperty(value, inject.property, {
                        get: () => {
                            switch (inject.type) {
                                case InjectionType.INJECT: return InjectionChain.get(inject.typeName).get();
                                case InjectionType.REPOSITORY: {
                                    const database = inject.data.database;
                                    const name = inject.data.name;
                                    const manager = getConnectionManager();
                                    if (manager.has(database)) {
                                        const connection = manager.get(database);
                                        if (connection != undefined) {
                                            return connection.getRepository(name);
                                        } else {
                                            throw new Error(`Connection not found.`);    
                                        }
                                    } else {
                                        throw new Error(`Database not found ${database}`);
                                    }
                                    break;
                                }
                                case InjectionType.PERSISTENCE: {
                                    const name = inject.data.name;
                                    const manager = getConnectionManager();
                                    if (manager.has(name)) {
                                        return manager.get(name);
                                    }
                                    break;
                                }
                            }
                        }
                    });
                });
            });
            return value;
        });
    });

    InjectionChain.forEach((key, value) => {
        onInit(value);
    });

}
