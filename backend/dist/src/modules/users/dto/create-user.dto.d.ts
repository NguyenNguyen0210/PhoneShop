import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from '@prisma/client';
export declare class CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roles?: Role[];
    status?: UserStatus;
}
