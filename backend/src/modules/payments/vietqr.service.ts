import { Injectable, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemSettingsService } from '../settings/settings.service';

export interface VietQrResponse {
  qrUrl: string;
  bankId: string;
  accountNo: string;
  accountName: string;
  amount: number;
  orderNumber: string;
}

@Injectable()
export class VietqrService {
  private readonly defaultBankId: string;
  private readonly defaultAccountNo: string;
  private readonly defaultAccountName: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly settingsService?: SystemSettingsService,
  ) {
    this.defaultBankId = this.configService.get<string>(
      'VIETQR_BANK_ID',
      '970422', // MBBank
    );
    this.defaultAccountNo = this.configService.get<string>(
      'VIETQR_ACCOUNT_NO',
      '0987654321',
    );
    this.defaultAccountName = this.configService.get<string>(
      'VIETQR_ACCOUNT_NAME',
      'CONG TY MOBILECOMMERCE',
    );
  }

  async generateQrAsync(
    amount: number,
    orderNumber: string,
    options?: {
      bankId?: string;
      accountNo?: string;
      accountName?: string;
    },
  ): Promise<VietQrResponse> {
    if (this.settingsService) {
      const isEnabled =
        (await this.settingsService.get('PAYMENT_VIETQR_ENABLED', 'true')) === 'true';
      if (!isEnabled) {
        throw new BadRequestException('Phương thức thanh toán VietQR đang tạm ngưng');
      }

      const bankId =
        options?.bankId || (await this.settingsService.get('VIETQR_BANK_ID', this.defaultBankId));
      const accountNo =
        options?.accountNo || (await this.settingsService.get('VIETQR_ACCOUNT_NO', this.defaultAccountNo));
      const accountName =
        options?.accountName ||
        (await this.settingsService.get('VIETQR_ACCOUNT_NAME', this.defaultAccountName));
      const template = await this.settingsService.get('VIETQR_TEMPLATE', 'compact2');

      const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amount}&addInfo=${encodeURIComponent(orderNumber)}&accountName=${encodeURIComponent(accountName)}`;

      return {
        qrUrl,
        bankId,
        accountNo,
        accountName,
        amount,
        orderNumber,
      };
    }

    return this.generateQr(amount, orderNumber, options);
  }

  generateQr(
    amount: number,
    orderNumber: string,
    options?: {
      bankId?: string;
      accountNo?: string;
      accountName?: string;
    },
  ): VietQrResponse {
    const bankId = options?.bankId || this.defaultBankId;
    const accountNo = options?.accountNo || this.defaultAccountNo;
    const accountName = options?.accountName || this.defaultAccountName;

    const encodedAccountName = encodeURIComponent(accountName);
    const encodedOrderNumber = encodeURIComponent(orderNumber);

    const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodedOrderNumber}&accountName=${encodedAccountName}`;

    return {
      qrUrl,
      bankId,
      accountNo,
      accountName,
      amount,
      orderNumber,
    };
  }
}
