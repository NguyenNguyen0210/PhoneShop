import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  constructor(private readonly configService: ConfigService) {
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
