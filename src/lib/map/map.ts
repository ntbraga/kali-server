
export class MapObject<V> {
    [key: string]: V;
}

export class Optional<V> {
    private value: V;

    public static of<T>(value: T): Optional<T> {
        return new Optional<T>(value);
    }

    public static empty<T>(): Optional<T> {
        return new Optional(undefined);
    }

    constructor(value: V) {
        this.value = value;
    }

    public get() {
        return this.value;
    }

    public getOrDefault(def: V) {
        return this.value != undefined ? this.value : def;
    }

    public ifPresent(callback: (value: V) => void): Optional<V> {
        if (this.value != undefined) {
            callback(this.value);
        }
        return this;
    }

    public getCopy(): V {
        return Object.assign({}, this.value);
    }

    public ifNotPresent(callback: () => void) {
        if (this.value == undefined) {
            callback();
        }
        return this;
    }

    public then(callback: (value: V) => void): Optional<V> {
        return this.ifPresent(callback);
    }

}

export interface Entry {
    key: string;
    value: string;
}

export abstract class Map<V> {
    protected inner: MapObject<V>;

    constructor() {
        this.inner = new MapObject();
    }

    public static fromOther<K>(object: Map<K>) {
        const map: Map<K> = new HashMap<K>();
        Object.keys(object.inner).forEach((key) => map.put(key, object[key]));
        return map;
    }

    public debug() {
        console.group('map');

        console.log('size:', this.size());
        console.log(this.inner);

        console.groupEnd();
    }

    public forEach(callback: (key: string, value: V) => void) {
        Object.keys(this.inner).forEach((key) => {
            callback(key, this.inner[key]);
        });
    }

    public forEachKey(callback: (key: string) => void) {
        Object.keys(this.inner).forEach((key) => {
            callback(key);
        });
    }

    public forEachAsync(callback: (key: string, value: V) => void): Promise<Map<V>> {
        return new Promise((resolve, reject) => {
            Object.keys(this.inner).forEach((key) => {
                callback(key, this.inner[key]);
            });
            resolve(this);
        });
    }

    public map<X>(callback: (key: string, value: V) => X) {
        const map: Map<X> = new HashMap();

        Object.keys(this.inner).forEach((key) => {
            map.put(key, callback(key, this.inner[key]));
        });

        return map;
    }

    public mapKeyValue<X>(callback: (key: string, value: V) => { key: string, value: X }) {
        const map: Map<X> = new HashMap();

        Object.keys(this.inner).forEach((key) => {
            const nEntry = callback(key, this.inner[key]);
            map.put(nEntry.key, nEntry.value);
        });

        return map;
    }

    public values(): V[] {
        const arr: V[] = [];

        this.forEach((k, v) => arr.push(v));

        return arr;
    }

    public keys(): string[] {
        return Object.keys(this.inner);
    }

    public getAsObject(): MapObject<V> {
        return this.inner;
    }

    public pure(): any {
        const obj = {};

        Object.keys(this.inner).forEach((key) => {
            obj[key] = this.inner[key];
        });

        return obj;
    }

    public size() {
        return Object.keys(this.inner).length;
    }

    public filter(filterFunc: (key: string, value: V) => boolean) {
        const map: Map<V> = new HashMap();

        Object.keys(this.inner).forEach((key) => {
            if (filterFunc(key, this.inner[key])) {
                map.put(key, this.inner[key]);
            }
        });

        return map;
    }

    public changeIfPresent(key: string, changeFunc: (value: V) => V): Map<V> {
        if (this.inner[key] != undefined) {
            Object.assign(this.inner[key], changeFunc(this.inner[key]));
        }
        return this;
    }

    public changeOrSet(key: string, changeFunc: (value: Optional<V>) => V): Map<V> {
        const value = this.inner[key];
        const opt = changeFunc(Optional.of(value));
        if (opt != undefined) {
            this.inner[key] = opt;
        }
        return this;
    }

    public forEachChange(changeFunc: (value: V) => V): Map<V> {
        this.forEach((key, value) => {
            this.change(key, changeFunc);
        });
        return this;
    }

    public change(key: string, changeFunc: (value: V) => V): Map<V> {
        if (this.inner[key] == undefined) {
            this.inner[key] = changeFunc(undefined);
        } else {
            Object.assign(this.inner[key], changeFunc(this.inner[key]));
        }
        return this;
    }

    public changeWithDefault(key: string, def: V, changeFunc: (value: V) => V): Map<V> {
        if (this.inner[key] == undefined) {
            this.inner[key] = def;
        }
        return this.change(key, changeFunc);
    }

    public assign(object: MapObject<V>): Map<V> {
        Object.keys(object).forEach((key) => {
            if (this.inner[key] == undefined) {
                this.inner[key] = object[key];
            } else {
                Object.assign(this.inner[key], object[key]);
            }
        });
        return this;
    }

    public replace(map: Map<V>): Map<V> {
        this.inner = map.inner;
        return this;
    }

    public get object(): MapObject<V> {
        return this.inner;
    }

    public has(key: string): boolean {
        return this.inner[key] != undefined;
    }

    public abstract put(key: string, value: V): Map<V>;
    public abstract get(key: string): Optional<V>;
    public abstract remove(key: string): Optional<V>;
}

export class HashMap<V> extends Map<V> {

    public static fromObject<K>(object: MapObject<K>) {
        const map: Map<K> = new HashMap<K>();
        Object.keys(object).forEach((key) => map.put(key, object[key]));
        return map;
    }

    public put(key: string, value: V) {
        this.inner[key] = value;
        return this;
    }

    public get(key: string): Optional<V> {
        return Optional.of<V>(this.inner[key]);
    }

    public remove(key: string): Optional<V> {
        const value = this.get(key);
        delete this.inner[key];
        return value;
    }

}

export abstract class List<T> {
    protected innerArray: T[];

    constructor() {
        this.innerArray = [];
    }

    add(value: T) {
        this.innerArray.push(value);
    }

    hasNext(): boolean {
        return this.innerArray.length > 0;
    }

    abstract getNext(): Optional<T>;

}

export class FiFoList<T> extends List<T> {
    getNext(): Optional<T> {
        return Optional.of(this.innerArray.shift());
    }
}

export class LiFoList<T> extends List<T> {
    getNext(): Optional<T> {
        return Optional.of(this.innerArray.pop());
    }
}

// export class ModalPile {
//     protected inner: Map<LiFoList<Pi9ModalComponent>>;

//     constructor() {
//         this.inner = new HashMap<LiFoList<Pi9ModalComponent>>();
//     }

//     public addModal<C extends Pi9ModalComponent>(parent: string, modal: C) {
//         const lifo = this.inner.get(parent).getOrDefault(new LiFoList<Pi9ModalComponent>());
//         lifo.add(modal);
//         this.inner.put(parent, lifo);
//     }

//     public closeTopModal(parent: string): Optional<Pi9ModalComponent> {
//         const modais = this.inner.get(parent).getOrDefault(new LiFoList<Pi9ModalComponent>());
//         const optModal = modais.getNext();
//         optModal.ifPresent((modal) => {
//             modal.closeInternal();
//         });
//         return optModal;
//     }

// }

export class TaskMap<V> {
    protected inner: MapObject<FiFoList<V>>;
    protected innerObservers: MapObject<Function>;
    constructor() {
        this.inner = new MapObject<FiFoList<V>>();
        this.innerObservers = new MapObject<Function>();
    }

    subscribe(key: string, callback: Function) {
        this.innerObservers[key] = callback;
    }

    unsubscribe(key: string) {
        this.innerObservers[key] = undefined;
    }

    public put(key: string, value: V) {
        if (this.inner[key] == undefined) {
            this.inner[key] = new FiFoList<V>();
        }
        this.inner[key].add(value);
        if (this.innerObservers[key] instanceof Function) {
            this.innerObservers[key]();
        }
    }

    public get(key: string): Optional<V> {
        if (this.inner[key] != undefined) {
            return this.inner[key].getNext();
        }
        return Optional.empty();
    }

    public hasNext(key: string): boolean {
        if (this.inner[key] == undefined) {
            return false;
        }
        return this.inner[key].hasNext();
    }

}

export interface Validatable {
    validatable: () => boolean;
}

export interface MappableObject<V> {
    getName: () => string;
    getValue: () => V;
}

export interface ValidateResponse<C extends Validatable> {
    status: boolean;
    invalid?: C;
    data?: any;
}

export type ValidatableMappableObject<V> = Validatable & MappableObject<V>;

export class ValidatableArray<C extends Validatable> {
    protected inner: C[];

    constructor() {
        this.inner = [];
    }

    public push(value: C) {
        this.inner.push(value);
    }

    public validatable(): ValidateResponse<C> {
        for (const value of this.inner) {
            if (!value.validatable()) {
                return {
                    status: false,
                    invalid: value
                };
            }
        }
        return { status: true };
    }

}

export class ArrayObject<T, C extends ValidatableMappableObject<T>> extends ValidatableArray<C> {
    public map() {
        const obj = {};
        this.inner.forEach((m) => {
            if (m.getValue() != undefined) {
                obj[m.getName()] = m.getValue();
            }
        });
        return obj;
    }

    public execute(funct: (value: C) => void) {
        for (const value of this.inner) {
            funct(value);
        }
    }

}

export function newId() {
    return Math.random().toString(36).substr(2, 9);
}

export type TypedFunction<T> = () => T;
export type TypedCallback<T> = (value: T) => void;

export class ConditionalExecutor<T> {

    constructor(private task: TypedFunction<T>) { }

    public static create<T>(task: TypedFunction<T>) {
        return new ConditionalExecutor<T>(task);
    }

    doIf(condition: TypedFunction<boolean>) {
        return new ConditionalTask(this.task, condition);
    }

}

class ConditionalTask<T> {

    constructor(private task: TypedFunction<T>, private condition: TypedFunction<boolean>) { }

    execute(callback?: TypedCallback<T>) {
        if (this.condition()) {
            const value = this.task();
            if (callback != undefined) {
                callback(value);
            } else return value;
        }
        return undefined;
    }
}

export class ConditionalAsyncExecutor<T> {

    constructor(private task: TypedFunction<T>) { }

    public static create<T>(task: TypedFunction<T>) {
        return new ConditionalAsyncExecutor<T>(task);
    }

    doIf(condition: TypedFunction<boolean>) {
        return new ConditionalAsyncTask(this.task, condition);
    }

}

class ConditionalAsyncTask<T> {

    private rejectOnFalse = false;
    private completeOnFalse = false;
    private reason: any;
    private defaultValue: T;

    constructor(private task: TypedFunction<T>, private condition: TypedFunction<boolean>) { }

    rejectIfFalse(reject?: boolean, reason?: any): ConditionalAsyncTask<T> {
        this.rejectOnFalse = reject == undefined ? true : reject;
        this.reason = reason;
        return this;
    }

    resolveIfFalse(resolve?: boolean, def?: T): ConditionalAsyncTask<T> {
        this.completeOnFalse = resolve == undefined ? true : resolve;
        this.defaultValue = def;
        return this;
    }

    execute() {
        return new Promise((resolve, reject) => {
            const willExecute = this.condition();
            if (willExecute) {
                resolve(this.task());
            } else if (this.rejectOnFalse) {
                reject(this.reason);
            } else if (this.completeOnFalse) {
                resolve(this.defaultValue);
            }

        }).then((ret) => ret);
    }

}

// const executions: Map<OneTimeExecutor<any>> = new HashMap();

// export class OneTimeExecutor<T> {
//     private executed = false;
//     private executor: ConditionalExecutor<T>;

//     constructor(private id:string, private task: TypedFunction<T>) {
//         this.executor = ConditionalExecutor.create(task);
//     }

//     public static create<T>(id: string, task: TypedFunction<T>) {
//         let exec = executions.get(id);
//         return exec.ifNotPresent(() => console.log('create', id)).getOrDefault(new OneTimeExecutor<T>(id, task));
//     }

//     public execute(callback?: TypedCallback<T>) {
//         let execute = false;
//         if (!this.executed) {
//             this.executed = true;
//             execute = true;
//         }
//         return this.executor.doIf(() => execute).execute(callback);
//     }

// }
