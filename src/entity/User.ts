import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { UserDetails } from "../lib/auth/authentication";

@Entity()
export class User extends UserDetails<number> {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column()
    age: number;

    @Column()
    username: string;

    @Column()
    password: string;

    getId(): number {
        return this.id;
    }

    getUsername(): string {
        return this.username;
    }

    getPassword(): string {
        return this.password;
    }

}
