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
exports.UpdateShippingDto = exports.UpdateShippingStatusDto = exports.CreateShippingDto = exports.ShippingStatus = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
var ShippingStatus;
(function (ShippingStatus) {
    ShippingStatus["PENDING"] = "PENDING";
    ShippingStatus["READY_TO_SHIP"] = "READY_TO_SHIP";
    ShippingStatus["PICKED_UP"] = "PICKED_UP";
    ShippingStatus["IN_TRANSIT"] = "IN_TRANSIT";
    ShippingStatus["DELIVERED"] = "DELIVERED";
    ShippingStatus["FAILED"] = "FAILED";
    ShippingStatus["RETURNED"] = "RETURNED";
})(ShippingStatus || (exports.ShippingStatus = ShippingStatus = {}));
class CreateShippingDto {
    orderId;
    providerName;
    trackingNumber;
    shippingFee;
    estimatedDeliveryDate;
}
exports.CreateShippingDto = CreateShippingDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'uuid-of-order' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingDto.prototype, "orderId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'GHN' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Length)(2, 100),
    __metadata("design:type", String)
], CreateShippingDto.prototype, "providerName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'GHN123456789' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateShippingDto.prototype, "trackingNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '30000' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreateShippingDto.prototype, "shippingFee", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: '2026-08-25T00:00:00.000Z' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateShippingDto.prototype, "estimatedDeliveryDate", void 0);
class UpdateShippingStatusDto {
    status;
    trackingNumber;
    estimatedDeliveryDate;
}
exports.UpdateShippingStatusDto = UpdateShippingStatusDto;
__decorate([
    (0, swagger_1.ApiProperty)({ enum: ShippingStatus }),
    (0, class_validator_1.IsEnum)(ShippingStatus),
    __metadata("design:type", String)
], UpdateShippingStatusDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ example: 'GHN123456789' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateShippingStatusDto.prototype, "trackingNumber", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], UpdateShippingStatusDto.prototype, "estimatedDeliveryDate", void 0);
class UpdateShippingDto extends (0, swagger_1.PartialType)(CreateShippingDto) {
}
exports.UpdateShippingDto = UpdateShippingDto;
//# sourceMappingURL=shipping.dto.js.map