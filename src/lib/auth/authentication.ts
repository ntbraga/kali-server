import { Request, Response, NextFunction } from 'express';
import { HttpStatus } from "../main/http";

export abstract class AuthService<R, T extends UserDetails<any>> {

    abstract authenticate(authentication: R): Promise<false | T>;
    abstract onError(authentication: R, reason);

    login(req: Request, res: Response, next: NextFunction) {
        if (req.body != undefined) {
            this.authenticate(req.body).then((value) => {
                if (value == false) {
                    req.session.destroy(() => res.status(HttpStatus.BAD_REQUEST).send(this.onError(req.body, value)));
                } else {
                    req.session.user = value;
                    req.session.auth = req.body;
                    res.json(value);
                }
            }).catch((err) => {
                req.session.destroy(() => res.status(HttpStatus.BAD_REQUEST).send(this.onError(req.body, err)));
            });
        } else {
            req.session.destroy(() => res.status(HttpStatus.BAD_REQUEST).send(this.onError(req.body, req.body)));
        }
    }

    logout(req: Request, res: Response, next: NextFunction) {
        req.session.destroy((err) => {
            if (err) return res.status(HttpStatus.BAD_REQUEST).send(err);
            return res.json({});
        })
    }

}

export interface AuthError {
    status?: number;
    message: string;
}

export abstract class UserDetails<T> {
    abstract getId(): T;
    abstract getUsername(): string;
    abstract getPassword(): string;
}