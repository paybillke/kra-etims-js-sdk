import { BaseOClient } from './BaseOClient';
import { Validator } from './Validator';
import { type OscuConfig } from '../config';
import { AuthOClient } from './AuthOClient';

export class EtimsOClient extends BaseOClient {
  protected validator: Validator;

  constructor(config: OscuConfig, auth: AuthOClient) {
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
    return this.post('selectCustomer', this.validate(data, 'selectCustomer'));
  }

  async selectBranches(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectBhfList', this.validate(data, 'lastReqOnly'));
  }

  async saveBranchCustomer(data: Record<string, unknown>): Promise<unknown> {
    return this.post('saveBhfCustomer', this.validate(data, 'saveBhfCustomer'));
  }

  async saveBranchUser(data: Record<string, unknown>): Promise<unknown> {
    return this.post('saveBhfUser', this.validate(data, 'saveBhfUser'));
  }

  async saveBranchInsurance(data: Record<string, unknown>): Promise<unknown> {
    return this.post('saveBhfInsurance', this.validate(data, 'saveBhfInsurance'));
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
    return this.post('saveItemComposition', this.validate(data, 'saveItemComposition'));
  }

  // -----------------------------
  // IMPORTED ITEMS
  // -----------------------------
  async selectImportedItems(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectImportItemList', this.validate(data, 'lastReqOnly'));
  }

  async updateImportedItem(data: Record<string, unknown>): Promise<unknown> {
    return this.post('updateImportItem', this.validate(data, 'updateImportItem'));
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
    return this.post('saveTrnsSalesOsdc', this.validate(data, 'saveTrnsSalesOsdc'));
  }

  // -----------------------------
  // STOCK
  // -----------------------------
  async selectStockMovement(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectStockMoveList', this.validate(data, 'lastReqOnly'));
  }

  async saveStockIO(data: Record<string, unknown>): Promise<unknown> {
    return this.post('insertStockIO', this.validate(data, 'insertStockIO'));
  }

  async saveStockMaster(data: Record<string, unknown>): Promise<unknown> {
    return this.post('saveStockMaster', this.validate(data, 'saveStockMaster'));
  }

  // -----------------------------
  // NOTICES
  // -----------------------------
  async selectNoticeList(data: Record<string, unknown>): Promise<unknown> {
    return this.post('selectNoticeList', this.validate(data, 'lastReqOnly'));
  }
}
