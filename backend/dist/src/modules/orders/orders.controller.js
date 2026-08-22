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
exports.OrdersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const orders_service_1 = require("./orders.service");
const order_dto_1 = require("./dto/order.dto");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_enum_1 = require("../../common/enums/role.enum");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const client_1 = require("@prisma/client");
let OrdersController = class OrdersController {
    ordersService;
    constructor(ordersService) {
        this.ordersService = ordersService;
    }
    checkout(user, dto) {
        return this.ordersService.checkout(user.id, dto);
    }
    findMyOrders(user) {
        return this.ordersService.findMyOrders(user.id);
    }
    findMyOrder(user, id) {
        return this.ordersService.findMyOrder(user.id, id);
    }
    cancelMyOrder(user, id, dto) {
        return this.ordersService.cancelMyOrder(user.id, id, dto);
    }
    findAll() {
        return this.ordersService.findAll();
    }
    findOne(id) {
        return this.ordersService.findOne(id);
    }
    confirm(id) {
        return this.ordersService.transitionStatus(id, client_1.OrderStatus.CONFIRMED);
    }
    process(id) {
        return this.ordersService.transitionStatus(id, client_1.OrderStatus.PROCESSING);
    }
    ship(id) {
        return this.ordersService.transitionStatus(id, client_1.OrderStatus.SHIPPING);
    }
    deliver(id) {
        return this.ordersService.transitionStatus(id, client_1.OrderStatus.DELIVERED);
    }
    complete(id) {
        return this.ordersService.transitionStatus(id, client_1.OrderStatus.COMPLETED);
    }
    cancel(id, dto) {
        return this.ordersService.transitionStatus(id, client_1.OrderStatus.CANCELLED);
    }
};
exports.OrdersController = OrdersController;
__decorate([
    (0, common_1.Post)('checkout'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.USER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Checkout and create order from cart' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, order_dto_1.CreateOrderDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "checkout", null);
__decorate([
    (0, common_1.Get)('my'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.USER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get my orders' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findMyOrders", null);
__decorate([
    (0, common_1.Get)('my/:id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.USER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get my order detail' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findMyOrder", null);
__decorate([
    (0, common_1.Put)('my/:id/cancel'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.USER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel my order (USER)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, order_dto_1.CancelOrderDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "cancelMyOrder", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get all orders (STAFF/MANAGER/ADMIN)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get order detail (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id/confirm'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Confirm order (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "confirm", null);
__decorate([
    (0, common_1.Put)(':id/process'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Process order (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "process", null);
__decorate([
    (0, common_1.Put)(':id/ship'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Ship order (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "ship", null);
__decorate([
    (0, common_1.Put)(':id/deliver'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Mark delivered (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "deliver", null);
__decorate([
    (0, common_1.Put)(':id/complete'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Complete order (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "complete", null);
__decorate([
    (0, common_1.Put)(':id/cancel'),
    (0, roles_decorator_1.Roles)(role_enum_1.Role.STAFF, role_enum_1.Role.MANAGER, role_enum_1.Role.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel order (STAFF/MANAGER/ADMIN)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, order_dto_1.CancelOrderDto]),
    __metadata("design:returntype", void 0)
], OrdersController.prototype, "cancel", null);
exports.OrdersController = OrdersController = __decorate([
    (0, swagger_1.ApiTags)('Orders'),
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [orders_service_1.OrdersService])
], OrdersController);
//# sourceMappingURL=orders.controller.js.map