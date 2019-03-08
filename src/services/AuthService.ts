import { AuthService } from "../lib/auth/authentication";
import { User } from './../entity/User';
import { InjectRepository } from "../lib/decorators/injection";
import { Repository } from 'typeorm';
import { HttpStatus } from "../lib/main/http";

export class AuthServiceImpl extends AuthService<Authentication, User>{

    @InjectRepository(User)
    userRepository: Repository<User>;

    onError(auth: Authentication, reason) {
        if(reason == false) {
            return { message: 'Senha incorreta!', reason: reason };
        }

        if(reason.status == HttpStatus.UNAUTHORIZED) {
            return { message: 'Você precisa estar logado para consumir este serviço.', reason: reason};
        }

        return {
            message: 'Usuário inválido!',
            reason: reason
        }
    }

    authenticate(authentication: Authentication) {
        return this.userRepository.findOneOrFail({
            where: {
                username: authentication.username
            }
        }).then((user) => {
            if (authentication.password != user.password) {
                return false;
            }
            return user;
        });
    }

}

export interface Authentication {
    username: string;
    password: string;
}
