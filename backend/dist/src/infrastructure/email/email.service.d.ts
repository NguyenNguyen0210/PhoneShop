import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface SendEmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
}
export declare class EmailService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private transporter;
    private from;
    private isMock;
    constructor(config: ConfigService);
    onModuleInit(): void;
    send(options: SendEmailOptions): Promise<void>;
    sendOrderConfirmation(to: string, orderNumber: string, totalAmount: number): Promise<void>;
    sendPasswordReset(to: string, resetToken: string): Promise<void>;
    sendVerificationEmail(to: string, verificationCode: string): Promise<void>;
    sendShippingNotification(to: string, orderNumber: string, trackingNumber: string, providerName: string): Promise<void>;
    sendReturnApproved(to: string, returnNumber: string): Promise<void>;
}
