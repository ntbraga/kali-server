
import { TypeDecorator, Type } from 'lib/main';


export function Consumer(): TypeDecorator {
    return <T>(target: Type<T>) => {
        return target;
    }
}
