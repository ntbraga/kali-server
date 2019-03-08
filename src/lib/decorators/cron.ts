import { TypedMethodDecorator, PromiseMethod } from "../main";
import { schedule as ScheduleTask, validate as ValidateExpression, ScheduleOptions, ScheduledTask } from 'node-cron';
import { Map, HashMap, newId, ConditionalExecutor } from './../map/map';
import { getFromInjectionChainByName } from "./injection";
import * as cluster from 'cluster';

export type CronEvery = {
    every: number
}

export type CronRange = {
    from: number,
    to: number
}

export type CronEveryRange = {
    every: number,
    from: number,
    to: number
}

export type CronType = '*' | number | number[] | CronEvery | CronRange | CronEveryRange;
export type FunctionCronType = () => CronType;
export type CronTypeParam = CronType | FunctionCronType
export interface CronSyntax {
    second?: CronTypeParam,
    minute: CronTypeParam,
    hour: CronTypeParam,
    day: CronTypeParam,
    month: CronTypeParam,
    weekDay: CronTypeParam
}

export type ValidateFunction = () => boolean;

export interface ScheduleExecuteOptions {
    willexecute: boolean | ValidateFunction;
}

export interface ScheduleMeta {
    expression: string,
    property: string,
    target: string,
    task?: ScheduledTask,
    options?: ScheduleTaskOptions
}

export const CronTasks: Map<ScheduleMeta> = new HashMap<ScheduleMeta>();

export function ScheduleAll() {
    CronTasks.forEachKey((key) => {
        CronTasks.changeIfPresent(key, (task) => {
            const options = task.options;
            task.task = ScheduleTask(task.expression, () => {
                const type = getFromInjectionChainByName(task.target);
                const instance = type;
                const method = instance[task.property];
                const ret = method.apply(instance);
                const returnType = ret != undefined ? ret.constructor.name : 'undefined';

                switch (returnType) {
                    case 'Observable': {
                        break;
                    }
                    case 'Promise': {
                        ret.then(() => { });
                        break;
                    }
                    default: {
                        break;
                    }
                }

            }, options);
            return task;
        });
    });
}

function parseValue(value: any) {
    if (value == undefined) return undefined;

    if (value instanceof Function) {
        return parseValue(value());
    }

    if (Array.isArray(value)) {
        return value.join(',');
    }

    if (value.every != undefined && value.from == undefined && value.to == undefined) {
        return '*/' + value.every;
    }

    if (value.every == undefined && value.from != undefined && value.to != undefined) {
        return value.from + '-' + value.to;
    }

    if (value.every != undefined && value.from != undefined && value.to != undefined) {
        return value.from + '-' + value.to + '/' + value.every;
    }

    return value;
}

function syntaxToString(cron: CronSyntax | string): string {
    if (typeof cron == 'string') {
        return cron;
    }
    return `${parseValue(cron.second) || ''}${cron.second != undefined ? ' ' : ''}${parseValue(cron.minute)} ${parseValue(cron.hour)} ${parseValue(cron.day)} ${parseValue(cron.month)} ${parseValue(cron.weekDay)}`;
}

export type ScheduleTaskOptions = ScheduleOptions & { event: string };

export function Task(cron: CronSyntax | string, options?: ScheduleTaskOptions): TypedMethodDecorator<any> {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
        const target_name = target.constructor.name;
        ConditionalExecutor.create(() => {
            const expression = syntaxToString(cron);
            if (ValidateExpression(expression)) {
                CronTasks.put(newId(), {
                    expression: expression,
                    property: propertyKey,
                    target: target_name,
                    options: options
                });
            } else {
                throw new Error(`Expressão inválida ${expression}.`);
            }
        }).doIf(() => cluster.isMaster).execute();

    };
}
