
import { EventBus } from './../decorators/aware';
import { Observable } from 'rxjs';

export function onInit(instance: any) {
    if (instance.onInit instanceof Function) {
        instance.onInit();
    }
}

export interface Type<T> extends Function {
    new(...args: any[]): T;
}

export class TypeFactory {
    public static create<T>(type: Type<T>): T {
        return new type();
    }
}

export const SystemEventHandler = new EventBus();

export declare type TypeDecorator = (target: Type<any>) => Type<any> | void;
export declare type TypedMethodDecorator<T> = (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;
export declare type ObservableMethod = (...args: any[]) => Observable<any>;
export declare type TypedObservableMethod<T> = (...args: any[]) => Observable<T>;
export declare type PromiseMethod = (...args: any[]) => Promise<any>;
export declare type TypedPromiseMethod<T> = (...args: any[]) => Promise<T>;
export declare type ObservableMethodDecorator<T> = TypedMethodDecorator<TypedObservableMethod<T>>;
export declare type PromiseMethodDecorator<T> = TypedMethodDecorator<TypedPromiseMethod<T>>;
