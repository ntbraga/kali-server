import { Helper } from "../lib/decorators/injection";
import { Connection } from 'typeorm';
import { Persistence } from './../lib/decorators/injection';
import { User } from "../entity/User";

@Helper()
export class DataHelper {
    @Persistence()
    connection: Connection;

    findUsers() {
        return this.connection.getRepository(User).find();
    }

    hasMetadata(name: string) {
        return this.connection.hasMetadata(name);
    }

    getRepository(name: string) {
        return this.connection.getRepository(name);
    }
}

export class BodyExample {
    teste: string;

    getTeste(): string{
        return 'other ' + this.teste;
    }
}