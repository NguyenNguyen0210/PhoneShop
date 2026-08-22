"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: { include: { role: true } },
                addresses: true,
            },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        delete user.passwordHash;
        return user;
    }
    async updateProfile(userId, dto) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: dto,
        });
        delete user.passwordHash;
        return user;
    }
    async changePassword(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const isValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
        if (!isValid)
            throw new common_1.BadRequestException('Invalid old password');
        const hashedPassword = await bcrypt.hash(dto.newPassword, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: hashedPassword },
        });
        return { success: true };
    }
    async findAll() {
        const users = await this.prisma.user.findMany({
            include: { roles: { include: { role: true } } },
        });
        return users.map((u) => {
            delete u.passwordHash;
            return u;
        });
    }
    async findOne(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: { roles: { include: { role: true } } },
        });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        delete user.passwordHash;
        return user;
    }
    async create(dto) {
        const existingUser = await this.prisma.user.findFirst({
            where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
        });
        if (existingUser)
            throw new common_1.ConflictException('Email or phone already exists');
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const roleNames = dto.roles?.length ? dto.roles : ['USER'];
        const rolesToConnect = await this.prisma.role.findMany({
            where: { name: { in: roleNames } },
        });
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash: hashedPassword,
                firstName: dto.firstName,
                lastName: dto.lastName,
                phone: dto.phone,
                status: dto.status || 'ACTIVE',
                roles: {
                    create: rolesToConnect.map((r) => ({ roleId: r.id })),
                },
            },
            include: { roles: { include: { role: true } } },
        });
        delete user.passwordHash;
        return user;
    }
    async update(id, dto) {
        const data = { ...dto };
        delete data.password;
        delete data.roles;
        if (dto.password) {
            data.passwordHash = await bcrypt.hash(dto.password, 10);
        }
        if (dto.roles) {
            await this.prisma.userRole.deleteMany({ where: { userId: id } });
            const rolesToConnect = await this.prisma.role.findMany({
                where: { name: { in: dto.roles } },
            });
            data.roles = {
                create: rolesToConnect.map((r) => ({ roleId: r.id })),
            };
        }
        const user = await this.prisma.user.update({
            where: { id },
            data,
            include: { roles: { include: { role: true } } },
        });
        delete user.passwordHash;
        return user;
    }
    async changeStatus(id, status) {
        return this.prisma.user.update({
            where: { id },
            data: { status },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map