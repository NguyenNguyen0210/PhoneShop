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
exports.IdempotencyInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const idempotency_service_1 = require("./idempotency.service");
let IdempotencyInterceptor = class IdempotencyInterceptor {
    idempotencyService;
    constructor(idempotencyService) {
        this.idempotencyService = idempotencyService;
    }
    async intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const idempotencyKey = request.headers['x-idempotency-key'];
        if (!idempotencyKey) {
            return next.handle();
        }
        const userId = request.user?.id || null;
        const endpoint = request.originalUrl;
        const existingRecord = await this.idempotencyService.getRecord(idempotencyKey);
        if (existingRecord) {
            if (existingRecord.responseBody) {
                return (0, rxjs_1.of)(existingRecord.responseBody);
            }
            throw new common_1.HttpException('Request already in progress', common_1.HttpStatus.CONFLICT);
        }
        await this.idempotencyService.createRecord(idempotencyKey, userId, endpoint);
        return next.handle().pipe((0, operators_1.tap)(async (response) => {
            await this.idempotencyService.updateRecord(idempotencyKey, common_1.HttpStatus.OK, response);
        }));
    }
};
exports.IdempotencyInterceptor = IdempotencyInterceptor;
exports.IdempotencyInterceptor = IdempotencyInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [idempotency_service_1.IdempotencyService])
], IdempotencyInterceptor);
//# sourceMappingURL=idempotency.interceptor.js.map