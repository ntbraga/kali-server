import { TypeDecorator, Type, SystemEventHandler } from '../../lib/main';
import { Observable, Subscriber, Subscription, fromEvent, Subject } from "rxjs";
import { filter, map, publishBehavior } from 'rxjs/operators';

export interface Event<T> {
    name: string;
    content: T;
}

export enum SystemEvents {
    SYSTEM_STARTUP = 'SYSTEM_STARTUP'
}

export class EventBus {
    private eventList: string[];
    private subject: Subject<Event<any>>;
    private $bus: Observable<Event<any>>;
    constructor() {
        this.eventList = [];
        this.subject = new Subject();
        this.$bus = this.subject.asObservable();
    }

    private addEvent(name: string) {
        if (!this.eventList.includes(name)) {
            this.eventList.push(name);
        }
    }

    fromEvent<T>(name: string): Observable<T> {
        this.addEvent(name);
        return this.$bus.pipe(filter((event) => {
            return event.name == name
        }), map((value) => value.content));
    }

    subscribe<T>(name: string, subscriber: (value: T) => void): Subscription {
        return this.fromEvent<T>(name).subscribe(subscriber);
    }

    emit<T>(event: Event<T>) {
        this.addEvent(event.name);
        if (this.subject != undefined) {
            this.subject.next(event);
            return true;
        }
        return false;
    }
}

export function EventAware(event: string): TypeDecorator {
    return (target: Type<any>) => {
        return target;
    }
}

