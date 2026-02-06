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

  protected validate(data: Record<string, unknown>, schema: string): Record<string, unknown> {
    return this.validator.validate(data, schema);
  }

  // -----------------------------
  // INITIALIZATION
  // -----------------------------
  async selectInitOsdcInfo(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectInitOsdcInfo', this.validate(data, 'initialization'));
  }

  // -----------------------------
  // CODE LISTS
  // -----------------------------
  async selectCodeList(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectCodeList', this.validate(data, 'lastReqOnly'));
  }

  // -----------------------------
  // CUSTOMER / BRANCH
  // -----------------------------
  async selectCustomer(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectCustomer', this.validate(data, 'custSearchReq'));
  }

  async selectBranches(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectBhfList', this.validate(data, 'lastReqOnly'));
  }

  async saveBranchCustomer(data: Record<string, unknown>): Promise<unknown> {
    return this.post('saveBhfCustomer', this.validate(data, 'branchCustomer'));
  }

  async saveBranchUser(data: Record<string, unknown>): Promise<unknown> {
    return this.post('saveBhfUser', this.validate(data, 'branchUser'));
  }

  async saveBranchInsurance(data: Record<string, unknown>): Promise<unknown> {
    return this.post('saveBhfInsurance', this.validate(data, 'branchInsurance'));
  }

  // -----------------------------
  // ITEM
  // -----------------------------
  async selectItemClasses(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectItemClsList', this.validate(data, 'lastReqOnly'));
  }

  async selectItems(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectItemList', this.validate(data, 'lastReqOnly'));
  }

  async saveItem(data: Record<string, unknown>): Promise<unknown> {
    return this.post('saveItem', this.validate(data, 'saveItem'));
  }

  async saveItemComposition(data: Record<string, unknown>): Promise<unknown> {
    return this.post('SaveItemComposition', this.validate(data, 'itemComposition'));
  }

  // -----------------------------
  // IMPORTED ITEMS
  // -----------------------------
  async selectImportedItems(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectImportItemList', this.validate(data, 'lastReqOnly'));
  }

  async updateImportedItem(data: Record<string, unknown>): Promise<unknown> {
    return this.post('updateImportItem', this.validate(data, 'importItemUpdate'));
  }

  // -----------------------------
  // PURCHASES
  // -----------------------------
  async selectPurchases(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectTrnsPurchaseSalesList', this.validate(data, 'lastReqOnly'));
  }

  async savePurchase(data: Record<string, unknown>): Promise<unknown> {
    return this.post('insertTrnsPurchase', this.validate(data, 'insertTrnsPurchase'));
  }

  async saveSalesTransaction(data: Record<string, unknown>): Promise<unknown> {
    return this.post('TrnsSalesSaveWrReq', this.validate(data, 'lastReqOnly'));
  }

  // -----------------------------
  // STOCK
  // -----------------------------
  async selectStockMovement(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectStockMoveList', this.validate(data, 'lastReqOnly'));
  }

  async saveStockIO(data: Record<string, unknown>): Promise<unknown> {
    return this.post('insertStockIO', this.validate(data, 'saveStockIO'));
  }

  async saveStockMaster(data: Record<string, unknown>): Promise<unknown> {
    return this.post('saveStockMaster', this.validate(data, 'stockMaster'));
  }

  // -----------------------------
  // NOTICES
  // -----------------------------
  async selectNoticeList(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectNoticeList', this.validate(data, 'lastReqOnly'));
  }
}
