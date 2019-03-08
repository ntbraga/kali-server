import { TypedMethodDecorator, PromiseMethod } from "lib/main";

export function MessageHandler(): TypedMethodDecorator<PromiseMethod> {
    return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<PromiseMethod>) => {

    };
}