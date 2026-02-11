// etims.integration.test.ts
import { describe, test, beforeAll, expect } from 'vitest';
import { 
  AuthOClient, 
  EtimsOClient
} from '../src'; // Adjust import path as needed
import { existsSync, unlinkSync } from 'fs';

// ====================== ENV VALIDATION ======================
const requiredEnvVars = [
  'KRA_CONSUMER_KEY',
  'KRA_CONSUMER_SECRET',
  'KRA_TIN',
  'DEVICE_SERIAL'
] as const;

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`❌ Missing required environment variable: ${envVar}`);
  }
}

// ====================== HELPERS ======================
const formatDateForEtims = (daysOffset: number = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDhhmmss
};

const logSection = (title: string) => {
  const line = '='.repeat(70);
  console.log(`\n${line}\n${title}\n${line}`);
};

function clearTokenCache(cacheFile: string) {
  if (existsSync(cacheFile)) {
    unlinkSync(cacheFile);
    console.log(`🧹 Cleared token cache: ${cacheFile}`);
  }
}

// ====================== CONFIG ======================
const config = {
  env: 'sbx' as const,
  cacheFile: `${process.env.TMPDIR || '/tmp'}/kra_etims_token.json`,
  auth: {
    sbx: {
      consumer_key: process.env.KRA_CONSUMER_KEY!,
      consumer_secret: process.env.KRA_CONSUMER_SECRET!,
    },
    prod: {
      consumer_key: process.env.KRA_CONSUMER_KEY!,
      consumer_secret: process.env.KRA_CONSUMER_SECRET!,
    },
  },
  http: { timeout: 30 },
  oscu: {
    tin: process.env.KRA_TIN!,
    bhf_id: process.env.KRA_BHF_ID || '01',
    device_serial: process.env.DEVICE_SERIAL!,
    cmc_key: process.env.CMC_KEY || '',
  },
};

// ====================== TEST SUITE ======================
describe('KRA ETIMS Integration Tests', () => {
  let authOClient: AuthOClient;
  let etimsOClient: EtimsOClient;

  beforeAll(async () => {
    logSection('INITIALIZING SDK');
    authOClient = new AuthOClient(config);
    etimsOClient = new EtimsOClient(config, authOClient);

    // Clear cache before each test to ensure fresh tokens
    clearTokenCache(config.cacheFile);
        
    const token = await authOClient.getToken(true);
    
    console.log(`✅ Authentication successful`);
    console.log(`🔑 Token preview: ${token.substring(0, 25)}...`);
  }, 60_000); // Extended timeout for auth

  // ====================== TEST CASES ======================
  test('STEP 3: Code List Search', async () => {
    logSection('STEP 3: CODE LIST SEARCH');
    const response = await etimsOClient.selectCodeList({
      lastReqDt: formatDateForEtims(-7)
    });
    
    const clsList = response.clsList || [];
    console.log(`Found ${clsList.length} code classes`);
    
    clsList.forEach((cls: any) => {
      console.log(`- ${cls.cdCls}: ${cls.cdClsNm}`);
      (cls.dtlList || []).forEach((detail: any) => 
        console.log(`  • ${detail.cd}: ${detail.cdNm}`)
      );
    });
    
    expect(clsList).toBeInstanceOf(Array);
  }, 30_000);

  test('STEP 4: Customer Search', async () => {
    logSection('STEP 4: CUSTOMER SEARCH');
    const response = await etimsOClient.selectCustomer({
      custmTin: 'A123456789Z'
    });
    
    const custList = response.data?.custList || [];
    console.log(`Found ${custList.length} customers`);
    
    custList.forEach((cust: any) => {
      console.log(`- ${cust.tin}: ${cust.taxprNm} (${cust.taxprSttsCd})`);
    });
    
    expect(custList).toBeInstanceOf(Array);
  }, 30_000);

  test('STEP 5: Notice Search', async () => {
    logSection('STEP 5: NOTICE SEARCH');
    const response = await etimsOClient.selectNoticeList({
      lastReqDt: formatDateForEtims(-30)
    });
    
    const notices = response.data?.noticeList || [];
    console.log(`Found ${notices.length} notices`);
    
    notices.forEach((notice: any) => {
      console.log(`- [${notice.noticeNo}] ${notice.title}`);
    });
    
    expect(notices).toBeInstanceOf(Array);
  }, 30_000);

  test('STEP 6: Item Class Search', async () => {
    logSection('STEP 6: ITEM CLASS SEARCH');
    const response = await etimsOClient.selectItemClasses({
      lastReqDt: formatDateForEtims(-30)
    });
    
    const classes = response.data?.itemClsList || [];
    console.log(`Found ${classes.length} item classes`);
    
    classes.forEach((cls: any) => {
      console.log(`- ${cls.itemClsCd}: ${cls.itemClsNm} (Lvl ${cls.itemClsLvl})`);
    });
    
    expect(classes).toBeInstanceOf(Array);
  }, 30_000);

  test('STEP 7: Save Item', async () => {
    logSection('STEP 7: SAVE ITEM');
    const response = await etimsOClient.saveItem({
      itemCd: `KE1NTXU${Date.now()}`, // Unique ID to avoid conflicts
      itemClsCd: '5059690800',
      itemTyCd: '1',
      itemNm: `Test Item ${Date.now()}`,
      orgnNatCd: 'KE',
      pkgUnitCd: 'NT',
      qtyUnitCd: 'U',
      taxTyCd: 'B',
      dftPrc: 3500,
      isrcAplcbYn: 'N',
      useYn: 'Y',
      regrId: 'Test',
      regrNm: 'Test',
      modrId: 'Test',
      modrNm: 'Test',
    });
    
    console.log(`✅ Item saved: ${response.resultMsg}`);
    expect(response.resultCd).toBe('000');
  }, 30_000);

  test('STEP 8: Item Search', async () => {
    logSection('STEP 8: ITEM SEARCH');
    const response = await etimsOClient.selectItems({
      lastReqDt: formatDateForEtims(-30)
    });
    
    const items = response.data?.itemList || [];
    console.log(`Found ${items.length} items`);
    
    items.slice(0, 3).forEach((item: any) => {
      console.log(`- ${item.itemCd}: ${item.itemNm} (${item.taxTyCd})`);
    });
    
    expect(items).toBeInstanceOf(Array);
  }, 30_000);

  test('STEP 9: Branch Search', async () => {
    logSection('STEP 9: BRANCH SEARCH');
    const response = await etimsOClient.selectBranches({
      lastReqDt: formatDateForEtims(-30)
    });
    
    const branches = response.data?.bhfList || [];
    console.log(`Found ${branches.length} branches`);
    
    branches.forEach((branch: any) => {
      console.log(`- ${branch.bhfId}: ${branch.bhfNm} (${branch.bhfSttsCd})`);
    });
    
    expect(branches).toBeInstanceOf(Array);
  }, 30_000);

  test('STEP 10: Save Branch Customer', async () => {
    logSection('STEP 10: SAVE BRANCH CUSTOMER');
    const response = await etimsOClient.saveBranchCustomer({
      custNo: `CUST123456`,
      custTin: 'A123456789Z',
      custNm: `Test Customer ${Date.now()}`,
      useYn: 'Y',
      regrId: 'Test',
      regrNm: 'Test',
      modrId: 'Test',
      modrNm: 'Test',
    });
    
    console.log(`✅ Branch customer saved: ${response.resultMsg}`);
    expect(response.resultCd).toBe('000');
  }, 30_000);

  test('STEP 11: Save Branch User', async () => {
    logSection('STEP 11: SAVE BRANCH USER');
    const response = await etimsOClient.saveBranchUser({
      userId: `user_${Date.now()}`,
      userNm: `Test User ${Date.now()}`,
      pwd: 'SecurePass123!',
      useYn: 'Y',
      regrId: 'Test',
      regrNm: 'Test',
      modrId: 'Test',
      modrNm: 'Test',
    });
    
    console.log(`✅ Branch user saved: ${response.resultMsg}`);
    expect(response.resultCd).toBe('000');
  }, 30_000);

  test('STEP 12: Save Branch Insurance', async () => {
    logSection('STEP 12: SAVE BRANCH INSURANCE');
    const response = await etimsOClient.saveBranchInsurance({
      isrccCd: `INS12345`,
      isrccNm: `Test Insurance ${Date.now()}`,
      isrcRt: 20,
      useYn: 'Y',
      regrId: 'Test',
      regrNm: 'Test',
      modrId: 'Test',
      modrNm: 'Test',
    });
    
    console.log(`✅ Branch insurance saved: ${response.resultMsg}`);
    expect(response.resultCd).toBe('000');
  }, 30_000);

  test('STEP 14: Update Import Item', async () => {
    logSection('STEP 14: IMPORT ITEM UPDATE');
    // Note: This requires valid taskCd/dclNo from your environment
    // Using placeholder values - update with valid test data
    const response = await etimsOClient.updateImportedItem({
      taskCd: '2231943',
      dclDe: '20191217',
      itemSeq: 1,
      hsCd: '1231531231',
      itemClsCd: '5022110801',
      itemCd: 'KE1NTXU0000001',
      imptItemSttsCd: '1',
      remark: 'Updated via Vitest',
      modrId: 'Test',
      modrNm: 'Test',
    });
    
    console.log(`✅ Import item updated: ${response.resultMsg}`);
    expect(response.resultCd).toBe('000');
  }, 30_000);

  test('STEP 16: Save Purchase Transaction', async () => {
    logSection('STEP 16: PURCHASE TRANSACTION SAVE');
    const uniqueInvoice = `INV12345`;
    
    const response = await etimsOClient.savePurchase({
      invcNo: 1,
      orgInvcNo: 0,
      spplrTin: 'A123456789Z',
      spplrBhfId: null,
      spplrNm: null,
      spplrInvcNo: null,

      regTyCd: 'M',
      pchsTyCd: 'N',
      rcptTyCd: 'P',
      pmtTyCd: '01',
      pchsSttsCd: '02',

      cfmDt: '20200127210300',
      pchsDt: '20200127',
      wrhsDt: null,
      cnclReqDt: null,
      cnclDt: null,
      rfdDt: null,

      // -------------------- Totals --------------------
      totItemCnt: 2,

      taxblAmtA: 0,
      taxblAmtB: 10500,
      taxblAmtC: 0,
      taxblAmtD: 0,
      taxblAmtE: 0,

      taxRtA: 0,
      taxRtB: 18,
      taxRtC: 0,
      taxRtD: 0,
      taxRtE: 0,

      taxAmtA: 0,
      taxAmtB: 1890,
      taxAmtC: 0,
      taxAmtD: 0,
      taxAmtE: 0,

      totTaxblAmt: 10500,
      totTaxAmt: 1890,
      totAmt: 10500,

      remark: null,

      // -------------------- Audit --------------------
      regrId: 'Test',
      regrNm: 'Test',
      modrId: 'Test',
      modrNm: 'Test',

      // -------------------- Items --------------------
      itemList: [
        {
          itemSeq: 1,
          itemCd: 'KE1NTXU0000001',
          itemClsCd: '5059690800',
          itemNm: 'test item 1',
          bcd: null,

          spplrItemClsCd: null,
          spplrItemCd: null,
          spplrItemNm: null,

          pkgUnitCd: 'NT',
          pkg: 2,
          qtyUnitCd: 'U',
          qty: 2,
          prc: 3500,
          splyAmt: 7000,
          dcRt: 0,
          dcAmt: 0,

          taxblAmt: 7000,
          taxTyCd: 'B',
          taxAmt: 1260,
          totAmt: 7000,

          itemExprDt: null,
        },
        {
          itemSeq: 2,
          itemCd: 'KE1NTXU0000002',
          itemClsCd: '5022110801',
          itemNm: 'test item 2',
          bcd: null,

          spplrItemClsCd: null,
          spplrItemCd: null,
          spplrItemNm: null,

          pkgUnitCd: 'NT',
          pkg: 1,
          qtyUnitCd: 'U',
          qty: 1,
          prc: 3500,
          splyAmt: 3500,
          dcRt: 0,
          dcAmt: 0,

          taxblAmt: 3500,
          taxTyCd: 'B',
          taxAmt: 630,
          totAmt: 3500,

          itemExprDt: null,
        },
      ],
    });
    
    
    console.log(`✅ Purchase saved: ${response.resultMsg}`);
    expect(response.resultCd).toBe('000');
  }, 45_000);

  test('STEP 18: Save Stock In/Out', async () => {
    logSection('STEP 18: STOCK IN/OUT SAVE');
    
    const response = await etimsOClient.saveStockIO({
  tin: 'A123456789Z',
  bhfId: '00',
  sarNo: 2,
  orgSarNo: 2,
  regTyCd: 'M',
  custTin: 'A123456789Z',
  custNm: null,
  custBhfId: null,
  sarTyCd: '11',
  ocrnDt: '20260106',
  totItemCnt: 2,
  totTaxblAmt: 70000,
  totTaxAmt: 10677.96,
  totAmt: 70000,
  remark: null,
  regrId: 'Test',
  regrNm: 'Test',
  modrId: 'Test',
  modrNm: 'Test',

  itemList: [
    {
      itemSeq: 1,
      itemCd: 'KE1NTXU0000001',
      itemClsCd: '5059690800',
      itemNm: 'test item1',
      bcd: null,
      pkgUnitCd: 'NT',
      pkg: 10,
      qtyUnitCd: 'U',
      qty: 10,
      itemExprDt: null,
      prc: 3500,
      splyAmt: 35000,
      totDcAmt: 0,
      taxblAmt: 35000,
      taxTyCd: 'B',
      taxAmt: 5338.98,
      totAmt: 35000,
    },
    {
      itemSeq: 2,
      itemCd: 'KE1NTXU0000002',
      itemClsCd: '5059690800',
      itemNm: 'test item2',
      bcd: null,
      pkgUnitCd: 'BL',
      pkg: 10,
      qtyUnitCd: 'U',
      qty: 10,
      itemExprDt: null,
      prc: 3500,
      splyAmt: 35000,
      totDcAmt: 0,
      taxblAmt: 35000,
      taxTyCd: 'B',
      taxAmt: 5338.98,
      totAmt: 35000,
    },
  ],
});
    
    console.log(`✅ Stock movement saved: ${response.resultMsg}`);
    expect(response.resultCd).toBe('000');
  }, 30_000);

  test('STEP 19: Save Stock Master', async () => {
    logSection('STEP 19: SAVE STOCK MASTER');
    const response = await etimsOClient.saveStockMaster({
      itemCd: 'KE1NTXU0000002',
      rsdQty: 10,
      regrId: 'Test',
      regrNm: 'Test',
      modrId: 'Test',
      modrNm: 'Test',
    });
    
    console.log(`✅ Stock master updated: ${response.resultMsg}`);
    expect(response.resultCd).toBe('000');
  }, 30_000);

  // ====================== CLEANUP ======================
  // Note: Add afterAll hook here if cleanup is needed
  // afterAll(async () => { ... }, 30_000);
});