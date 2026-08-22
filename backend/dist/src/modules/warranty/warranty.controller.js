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
exports.WarrantyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const warranty_service_1 = require("./warranty.service");
const warranty_dto_1 = require("./dto/warranty.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_enum_1 = require("../../common/enums/role.enum");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let WarrantyController = class WarrantyController {
    warrantyService;
    constructor(warrantyService) {
        this.warrantyService = warrantyService;
    }
    getMyWarranties(user) {
        return this.warrantyService.getUserWarranties(user.id);
    }
    checkStatus(code) {
        return this.warrantyService.checkStatus(code);
    }
    searchByCode(code) {
        return this.warrantyService.searchByCode(code);
    }
    claimWarranty(user, id, dto) {
        return this.warrantyService.claimWarranty(user.id, id, dto);
    }
    findAll() {
        return this.warrantyService.findAll();
    }
    findOne(id) {
        return this.warrantyService.findOne(id);
    }
    create(dto) {
        return this.warrantyService.create(dto);
    }
    voidWarranty(id) {
        return this.warrantyService.voidWarranty(id);
    }
};
exports.WarrantyController = WarrantyController;
__decorate([
    (0, common_1.Get)('my'),
    (0, swagger_1.ApiOperation)({ summary: 'Get my warranties (USER)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "getMyWarranties", null);
__decorate([
    (0, common_1.Get)('check/:code'),
    (0, swagger_1.ApiOperation)({ summary: 'Check warranty by code (All)' }),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "checkStatus", null);
__decorate([
    (0, common_1.Get)('search/:code'),
    (0, swagger_1.ApiOperation)({ summary: 'Search warranty by code (All)' }),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "searchByCode", null);
__decorate([
    (0, common_1.Post)(':id/claim'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.USER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Claim warranty (USER)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, warranty_dto_1.ClaimWarrantyDto]),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "claimWarranty", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all warranties (STAFF/MANAGER/ADMIN)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get warranty detail (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Create warranty record (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [warranty_dto_1.CreateWarrantyDto]),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id/void'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Void warranty (MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], WarrantyController.prototype, "voidWarranty", null);
exports.WarrantyController = WarrantyController = __decorate([
    (0, swagger_1.ApiTags)('Warranty'),
    (0, common_1.Controller)('warranty'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [warranty_service_1.WarrantyService])
], WarrantyController);
//# sourceMappingURL=warranty.controller.js.map