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
exports.ImportImeiDto = exports.UpdateImeiStatusDto = exports.CreateImeiDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const client_1 = require("@prisma/client");
const class_transformer_1 = require("class-transformer");
class CreateImeiDto {
    variantId;
    imei;
    imei2;
    serialNumber;
    purchasePrice;
}
exports.CreateImeiDto = CreateImeiDto;
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], CreateImeiDto.prototype, "variantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateImeiDto.prototype, "imei", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateImeiDto.prototype, "imei2", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateImeiDto.prototype, "serialNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ type: Number }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreateImeiDto.prototype, "purchasePrice", void 0);
class UpdateImeiStatusDto {
    status;
}
exports.UpdateImeiStatusDto = UpdateImeiStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: client_1.ImeiStatus }),
    (0, class_validator_1.IsEnum)(client_1.ImeiStatus),
    __metadata("design:type", String)
], UpdateImeiStatusDto.prototype, "status", void 0);
class ImportImeiDto {
    items;
}
exports.ImportImeiDto = ImportImeiDto;
__decorate([
    (0, swagger_1.ApiProperty)({ type: [CreateImeiDto] }),
    __metadata("design:type", Array)
], ImportImeiDto.prototype, "items", void 0);
//# sourceMappingURL=imei.dto.js.map