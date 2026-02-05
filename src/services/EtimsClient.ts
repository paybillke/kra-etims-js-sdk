import { BaseClient } from './BaseClient';
import { Validator } from './Validator';
import { type KraEtimsConfig } from '../config';
import { AuthClient } from './AuthClient';

export class EtimsClient extends BaseClient {
  protected validator: Validator;

  constructor(config: KraEtimsConfig, auth: AuthClient) {
    super(config, auth);
    this.validator = new Validator();
  }

  /**
   * Internal validation helper
   */
  protected validate(
    data: Record<string, unknown>,
    schema: string
  ): Record<string, unknown> {
    return this.validator.validate(data, schema);
  }

  // =============================
  // INITIALIZATION (POSTMAN-COMPLIANT)
  // =============================
  async selectInitOsdcInfo(data: Record<string, unknown>): Promise<unknown> {
    /**
     * ✔ validates ONLY: tin, bhfId, dvcSrlNo
     * ✔ BaseClient handles auth headers + retries
     */
    const validated = this.validate(data, 'initialization');
    return this.post('selectInitOsdcInfo', validated);
  }

  // =============================
  // BASIC DATA ENDPOINTS
  // =============================
  async selectCodeList(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectCodeList', this.validate(data, 'codeList'));
  }

  async selectItemClsList(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectItemClsList', this.validate(data, 'itemClsList'));
  }

  async selectBhfList(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectBhfList', this.validate(data, 'bhfList'));
  }

  async selectNoticeList(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectNoticeList', this.validate(data, 'noticeList'));
  }

  async selectTaxpayerInfo(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'selectTaxpayerInfo',
      this.validate(data, 'taxpayerInfo')
    );
  }

  async selectCustomerList(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'selectCustomerList',
      this.validate(data, 'customerList')
    );
  }

  // =============================
  // PURCHASE ENDPOINTS
  // =============================
  async selectPurchaseTrns(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'selectPurchaseTrns',
      this.validate(data, 'purchaseTrns')
    );
  }

  // =============================
  // SALES ENDPOINTS
  // =============================
  async sendSalesTrns(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'sendSalesTrns',
      this.validate(data, 'salesTrns')
    );
  }

  async selectSalesTrns(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'selectSalesTrns',
      this.validate(data, 'selectSalesTrns')
    );
  }

  // =============================
  // STOCK ENDPOINTS
  // =============================
  async selectMoveList(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'selectMoveList',
      this.validate(data, 'moveList')
    );
  }

  async saveStockMaster(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'saveStockMaster',
      this.validate(data, 'stockMaster')
    );
  }

  // =============================
  // ADDITIONAL / POSTMAN ENDPOINTS
  // =============================
  async branchInsuranceInfo(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'branchInsuranceInfo',
      this.validate(data, 'branchInsurance')
    );
  }

  async branchUserAccount(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'branchUserAccount',
      this.validate(data, 'branchUserAccount')
    );
  }

  async branchSendCustomerInfo(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'branchSendCustomerInfo',
      this.validate(data, 'customerInfo')
    );
  }

  async sendPurchaseTransactionInfo(
    data: Record<string, unknown>
  ): Promise<unknown> {
    return this.post(
      'sendPurchaseTransactionInfo',
      this.validate(data, 'purchaseTransaction')
    );
  }

  async sendSalesTransaction(
    data: Record<string, unknown>
  ): Promise<unknown> {
    return this.post(
      'sendSalesTransaction',
      this.validate(data, 'salesTransaction')
    );
  }

  async saveItem(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'saveItem',
      this.validate(data, 'item')
    );
  }

  async insertStockIO(data: Record<string, unknown>): Promise<unknown> {
    return this.post(
      'insertStockIO',
      this.validate(data, 'stockIO')
    );
  }
}
