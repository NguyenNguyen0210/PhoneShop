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
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = EmailService_1 = class EmailService {
    config;
    logger = new common_1.Logger(EmailService_1.name);
    transporter;
    from;
    isMock;
    constructor(config) {
        this.config = config;
    }
    onModuleInit() {
        const host = this.config.get('EMAIL_HOST');
        const user = this.config.get('EMAIL_USER');
        const pass = this.config.get('EMAIL_PASS');
        this.from = this.config.get('EMAIL_FROM', 'no-reply@mobilecommerce.vn');
        this.isMock = !host || !user || !pass;
        if (this.isMock) {
            this.logger.warn('EMAIL credentials not set (EMAIL_HOST / EMAIL_USER / EMAIL_PASS). ' +
                'Running in mock mode — emails will only be logged to console.');
            return;
        }
        this.transporter = nodemailer.createTransport({
            host,
            port: this.config.get('EMAIL_PORT', 587),
            secure: this.config.get('EMAIL_SECURE') === 'true',
            auth: { user, pass },
        });
        this.logger.log(`Email transporter initialized (host=${host})`);
    }
    async send(options) {
        if (this.isMock) {
            this.logger.log(`[EMAIL MOCK] To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to} | Subject: ${options.subject}`);
            return;
        }
        try {
            await this.transporter.sendMail({
                from: this.from,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html,
            });
            this.logger.log(`Email sent to ${options.to}: ${options.subject}`);
        }
        catch (err) {
            this.logger.error(`Failed to send email to ${options.to}`, err.message);
            throw err;
        }
    }
    async sendOrderConfirmation(to, orderNumber, totalAmount) {
        await this.send({
            to,
            subject: `[MobileCommerce] Xác nhận đơn hàng #${orderNumber}`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">🎉 Cảm ơn bạn đã đặt hàng!</h2>
          <p>Đơn hàng <strong>#${orderNumber}</strong> của bạn đã được xác nhận.</p>
          <p>Tổng tiền: <strong style="color:#e94560">${totalAmount.toLocaleString('vi-VN')} đ</strong></p>
          <p>Chúng tôi sẽ thông báo ngay khi đơn hàng được giao đi.</p>
          <hr/>
          <small style="color:#888">MobileCommerce — Chuyên thiết bị di động</small>
        </div>
      `,
        });
    }
    async sendPasswordReset(to, resetToken) {
        await this.send({
            to,
            subject: `[MobileCommerce] Đặt lại mật khẩu`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">🔒 Đặt lại mật khẩu</h2>
          <p>Sử dụng token dưới đây để đặt lại mật khẩu (có hiệu lực <strong>30 phút</strong>):</p>
          <div style="background:#f4f4f4;padding:16px;border-radius:8px;font-size:20px;letter-spacing:4px;text-align:center">
            <strong>${resetToken}</strong>
          </div>
          <p style="color:#888;font-size:12px;margin-top:16px">Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.</p>
        </div>
      `,
        });
    }
    async sendVerificationEmail(to, verificationCode) {
        await this.send({
            to,
            subject: `[MobileCommerce] Xác thực email của bạn`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">✉️ Xác thực tài khoản</h2>
          <p>Mã xác thực của bạn là:</p>
          <div style="background:#1a1a2e;color:#fff;padding:24px;border-radius:8px;font-size:32px;letter-spacing:8px;text-align:center">
            <strong>${verificationCode}</strong>
          </div>
          <p style="color:#888;font-size:12px;margin-top:16px">Mã có hiệu lực trong <strong>15 phút</strong>.</p>
        </div>
      `,
        });
    }
    async sendShippingNotification(to, orderNumber, trackingNumber, providerName) {
        await this.send({
            to,
            subject: `[MobileCommerce] Đơn hàng #${orderNumber} đang được giao`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">🚚 Đơn hàng đang trên đường!</h2>
          <p>Đơn hàng <strong>#${orderNumber}</strong> đã được bàn giao cho <strong>${providerName}</strong>.</p>
          <p>Mã vận đơn: <strong style="color:#e94560">${trackingNumber}</strong></p>
          <p>Bạn có thể tra cứu trạng thái giao hàng trên website của đơn vị vận chuyển.</p>
        </div>
      `,
        });
    }
    async sendReturnApproved(to, returnNumber) {
        await this.send({
            to,
            subject: `[MobileCommerce] Yêu cầu hoàn hàng #${returnNumber} đã được duyệt`,
            html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1a1a2e">✅ Yêu cầu hoàn hàng được chấp thuận</h2>
          <p>Yêu cầu hoàn hàng <strong>#${returnNumber}</strong> của bạn đã được xét duyệt.</p>
          <p>Vui lòng gửi hàng về địa chỉ của chúng tôi trong vòng <strong>3 ngày làm việc</strong>.</p>
        </div>
      `,
        });
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map