import { Environment } from "lib/command/commands";

export const DefaultEnv: Environment = {
    port: 3001,
    connection: {
        type: 'mysql',
        host: 'localhost',
        port: 3306,
        database: 'test',
        synchronize: true,
        logging: false,
        entities: [
            'src/entity/**/*.ts'
        ],
        migrations: [
            'src/migration/**/*.ts'
        ],
        subscribers: [
            'src/subscriber/**/*.ts'
        ]
    }
}