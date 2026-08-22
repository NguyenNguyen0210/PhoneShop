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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImeiController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const imei_service_1 = require("./imei.service");
const imei_dto_1 = require("./dto/imei.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_enum_1 = require("../../common/enums/role.enum");
const client_1 = require("@prisma/client");
let ImeiController = class ImeiController {
    imeiService;
    constructor(imeiService) {
        this.imeiService = imeiService;
    }
    findAll(variantId, status) {
        return this.imeiService.findAll(variantId, status);
    }
    searchByImei(imei) {
        return this.imeiService.searchByImei(imei);
    }
    checkAvailability(imei) {
        return this.imeiService.checkAvailability(imei);
    }
    validate(imei) {
        return this.imeiService.validate(imei).then(valid => ({ imei, valid }));
    }
    findOne(id) {
        return this.imeiService.findOne(id);
    }
    add(dto) {
        return this.imeiService.add(dto);
    }
    import(dto) {
        return this.imeiService.import(dto);
    }
    reserve(id) {
        return this.imeiService.reserve(id);
    }
    markSold(id) {
        return this.imeiService.markSold(id);
    }
    returnDevice(id) {
        return this.imeiService.returnDevice(id);
    }
    block(id) {
        return this.imeiService.block(id);
    }
    warranty(id) {
        return this.imeiService.warranty(id);
    }
    updateStatus(id, dto) {
        return this.imeiService.updateStatus(id, dto);
    }
};
exports.ImeiController = ImeiController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'View all IMEI devices (MANAGER/ADMIN)' }),
    (0, swagger_1.ApiQuery)({ name: 'variantId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false, enum: client_1.ImeiStatus }),
    __param(0, (0, common_1.Query)('variantId')),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Search by IMEI number (STAFF/MANAGER/ADMIN)' }),
    (0, swagger_1.ApiQuery)({ name: 'imei', required: true }),
    __param(0, (0, common_1.Query)('imei')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "searchByImei", null);
__decorate([
    (0, common_1.Get)('check/:imei'),
    (0, swagger_1.ApiOperation)({ summary: 'Check IMEI availability' }),
    __param(0, (0, common_1.Param)('imei')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "checkAvailability", null);
__decorate([
    (0, common_1.Get)('validate/:imei'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate IMEI format (Luhn)' }),
    __param(0, (0, common_1.Param)('imei')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "validate", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get IMEI detail (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Add IMEI device (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [imei_dto_1.CreateImeiDto]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "add", null);
__decorate([
    (0, common_1.Post)('import'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk import IMEI devices (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [imei_dto_1.ImportImeiDto]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "import", null);
__decorate([
    (0, common_1.Put)(':id/reserve'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Reserve IMEI device (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "reserve", null);
__decorate([
    (0, common_1.Put)(':id/sell'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Mark IMEI as sold (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "markSold", null);
__decorate([
    (0, common_1.Put)(':id/return'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Return IMEI device (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "returnDevice", null);
__decorate([
    (0, common_1.Put)(':id/block'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Block IMEI device (MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "block", null);
__decorate([
    (0, common_1.Put)(':id/warranty'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Set IMEI to warranty status (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "warranty", null);
__decorate([
    (0, common_1.Put)(':id/status'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Manually update IMEI status (MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, imei_dto_1.UpdateImeiStatusDto]),
    __metadata("design:returntype", void 0)
], ImeiController.prototype, "updateStatus", null);
exports.ImeiController = ImeiController = __decorate([
    (0, swagger_1.ApiTags)('IMEI'),
    (0, common_1.Controller)('imei'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [imei_service_1.ImeiService])
], ImeiController);
//# sourceMappingURL=imei.controller.js.map