"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let IdempotencyService = class IdempotencyService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRecord(key) {
        return this.prisma.idempotencyRecord.findUnique({
            where: { key },
        });
    }
    async createRecord(key, userId, endpoint) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        return this.prisma.idempotencyRecord.create({
            data: {
                key,
                userId,
                endpoint,
                expiresAt,
            },
        });
    }
    async updateRecord(key, responseStatus, responseBody) {
        return this.prisma.idempotencyRecord.update({
            where: { key },
            data: {
                responseStatus,
                responseBody,
            },
        });
    }
};
exports.IdempotencyService = IdempotencyService;
exports.IdempotencyService = IdempotencyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdempotencyService);
//# sourceMappingURL=idempotency.service.js.map