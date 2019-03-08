import { ConnectionOptions } from "typeorm";
import { ClusterOptions } from './../decorators/server';
import { Map, MapObject, HashMap } from './../map/map';

interface Command<T> {
    default: T,
    alias: string[]
}

type Commands<T> = {
    [P in keyof T]: Command<T[P]>;
};

let environments: Map<Environment> = new HashMap<Environment>();

export const comandList: Commands<Environment> = {
    env: {
        default: 'def',
        alias: ['e']
    },
    port: {
        default: 3000,
        alias: ['p']
    },
    cluster: {
        default: undefined,
        alias: ['c']
    },
    clusterSize: {
        default: undefined,
        alias: ['cs']
    },
    connection: {
        default: undefined,
        alias: []
    },
    basePath: {
        default: '/',
        alias: ['bp']
    }
};

export interface Environment {
    env?: string;
    port: number;
    basePath?: string;
    cluster?: boolean | ClusterOptions;
    clusterSize?: number | boolean;
    connection: ConnectionOptions;
}

export let CommandLine: Environment;

export function exportEnvironments(envs: MapObject<Environment>) {
    environments = HashMap.fromObject(envs);
    CommandLine = CommandValues();
    return CommandLine;
}

function defaultValues() {
    return Object.keys(comandList).map((key) => ({ key: key, value: comandList[key].default })).reduce((pv, cv) => {
        pv[cv.key] = cv.value;
        return pv;
    }, {});
}

function CommandValues(): Environment {
    let args: any = {};
    process.argv.slice(2).forEach((arg) => {
        const spl = arg.split("=");
        if (spl[0] != undefined) {
            if (spl[1] != undefined) {
                if (!isNaN(Number(spl[1]))) {
                    args[spl[0].replace('--', '')] = Number(spl[1]);
                } else if (spl[1] == 'true' || spl[1] == 'false') {
                    args[spl[0].replace('--', '')] = spl[1] == 'true' ? true : false;
                } else {
                    args[spl[0].replace('--', '')] = spl[1];
                }
            } else {
                args[spl[0].replace('--', '')] = true;
            }
        }
    });

    const env: any = defaultValues();

    if (environments.has(args.env || env.env)) {
        return { ...env, ...environments.get(args.env).get(), ...args };
    }

    return { ...env, ...args };

}
