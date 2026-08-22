import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
            };
        } & {
            userId: string;
            roleId: string;
            assignedAt: Date;
        })[];
        addresses: {
            id: string;
            phone: string;
            createdAt: Date;
            updatedAt: Date;
            userId: string;
            type: import("@prisma/client").$Enums.AddressType;
            recipientName: string;
            addressLine1: string;
            addressLine2: string | null;
            ward: string | null;
            district: string | null;
            city: string;
            province: string | null;
            postalCode: string | null;
            country: string;
            isDefault: boolean;
        }[];
    } & {
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        emailVerified: boolean;
        phoneVerified: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        emailVerified: boolean;
        phoneVerified: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    changePassword(userId: string, dto: ChangePasswordDto): Promise<{
        success: boolean;
    }>;
    findAll(): Promise<({
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
            };
        } & {
            userId: string;
            roleId: string;
            assignedAt: Date;
        })[];
    } & {
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        emailVerified: boolean;
        phoneVerified: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findOne(id: string): Promise<{
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
            };
        } & {
            userId: string;
            roleId: string;
            assignedAt: Date;
        })[];
    } & {
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        emailVerified: boolean;
        phoneVerified: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(dto: CreateUserDto): Promise<{
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
            };
        } & {
            userId: string;
            roleId: string;
            assignedAt: Date;
        })[];
    } & {
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        emailVerified: boolean;
        phoneVerified: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, dto: UpdateUserDto): Promise<{
        roles: ({
            role: {
                id: string;
                createdAt: Date;
                name: string;
                description: string | null;
            };
        } & {
            userId: string;
            roleId: string;
            assignedAt: Date;
        })[];
    } & {
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        emailVerified: boolean;
        phoneVerified: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    changeStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'BANNED'): Promise<{
        id: string;
        email: string;
        phone: string | null;
        passwordHash: string;
        firstName: string | null;
        lastName: string | null;
        avatarUrl: string | null;
        status: import("@prisma/client").$Enums.UserStatus;
        emailVerified: boolean;
        phoneVerified: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
}
