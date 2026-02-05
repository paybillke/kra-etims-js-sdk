import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import dayjs from 'dayjs';
import { 
  AuthClient, 
  EtimsClient, 
  ApiException, 
  ValidationException,
  type KraEtimsConfig 
} from '../src';

// -------------------------------------------------
// TEST CONFIGURATION
// -------------------------------------------------
const TEST_CONFIG: KraEtimsConfig = {
  env: 'sandbox',

  cache_file: '/tmp/kra_etims_token_test.json',

  auth: {
    sandbox: {
      token_url: 'https://sbx.kra.go.ke/v1/token/generate'.trim(),
      consumer_key: process.env.KRA_CONSUMER_KEY || 'YOUR_SANDBOX_CONSUMER_KEY',
      consumer_secret: process.env.KRA_CONSUMER_SECRET || 'YOUR_SANDBOX_CONSUMER_SECRET',
    },
    production: {
      token_url: 'https://kra.go.ke/v1/token/generate'.trim(),
      consumer_key: process.env.KRA_PROD_CONSUMER_KEY || '',
      consumer_secret: process.env.KRA_PROD_CONSUMER_SECRET || '',
    },
  },

  api: {
    sandbox: {
      base_url: 'https://etims-api-sbx.kra.go.ke/etims-api'.trim(),
    },
    production: {
      base_url: 'https://etims-api.kra.go.ke/etims-api'.trim(),
    },
  },

  http: {
    timeout: 30,
  },

  oscu: {
    tin: process.env.KRA_TIN || 'A000000000X',
    bhf_id: process.env.KRA_BHF_ID || '001',
    cmc_key: process.env.CMC_KEY || '',  // Will be set after initialization
    // Note: device_serial passed during init, not in config
  },

  endpoints: {
    // INITIALIZATION
    selectInitOsdcInfo: '/selectInitOsdcInfo',
    
    // DATA MANAGEMENT
    selectCodeList: '/selectCodeList',
    selectTaxpayerInfo: '/selectTaxpayerInfo',
    selectNoticeList: '/selectNoticeList',
    selectCustomerList: '/selectCustomerList',
    selectItemClsList: '/selectItemClass',
    selectBhfList: '/branchList',
    
    // BRANCH MANAGEMENT
    branchInsuranceInfo: '/branchInsuranceInfo',
    branchUserAccount: '/branchUserAccount',
    branchSendCustomerInfo: '/branchSendCustomerInfo',
    
    // ITEM MANAGEMENT
    saveItem: '/saveItem',
    itemInfo: '/itemInfo',
    
    // PURCHASE MANAGEMENT
    selectPurchaseTrns: '/getPurchaseTransactionInfo',
    sendPurchaseTransactionInfo: '/sendPurchaseTransactionInfo',
    
    // SALES MANAGEMENT
    sendSalesTransaction: '/sendSalesTransaction',
    selectSalesTrns: '/selectSalesTransactions',
    selectInvoiceDetail: '/selectInvoiceDetail',
    
    // STOCK MANAGEMENT
    insertStockIO: '/insert/stockIO',
    saveStockMaster: '/save/stockMaster',
    selectMoveList: '/selectStockMoveLists',
  },
};

// -------------------------------------------------
// TEST FIXTURES & HELPERS
// -------------------------------------------------
function clearTokenCache(cacheFile: string) {
  if (existsSync(cacheFile)) {
    unlinkSync(cacheFile);
    console.log(`🧹 Cleared token cache: ${cacheFile}`);
  }
}

function getKraDateTime(daysOffset = 0) {
  return dayjs().add(daysOffset, 'day').format('YYYYMMDDHHmmss');
}

function getKraDate(daysOffset = 0) {
  return dayjs().add(daysOffset, 'day').format('YYYYMMDD');
}

// -------------------------------------------------
// VALIDATION
// -------------------------------------------------
if (TEST_CONFIG.auth.sandbox.consumer_key.includes('YOUR_')) {
  console.error('❌ Missing KRA sandbox credentials');
  console.error('   Set these environment variables:');
  console.error('   - KRA_CONSUMER_KEY');
  console.error('   - KRA_CONSUMER_SECRET');
  console.error('   - KRA_TIN');
  console.error('   - KRA_BHF_ID');
  console.error('   - DEVICE_SERIAL');
  process.exit(1);
}

// -------------------------------------------------
// TEST SUITE
// -------------------------------------------------
describe('KRA eTIMS OSCU SDK Integration Tests', () => {
  let auth: AuthClient;
  let etims: EtimsClient;
  let cmcKey: string | null = process.env.CMC_KEY;
  const deviceSerial = process.env.DEVICE_SERIAL || 'dvcv1130'; // KRA-approved test serial

  // Run once before all tests
  beforeAll(async () => {
    console.log('\n' + '='.repeat(70));
    console.log('  🚀 KRA eTIMS OSCU SDK INTEGRATION TEST SUITE');
    console.log('='.repeat(70));
    console.log(`  Environment: ${TEST_CONFIG.env}`);
    console.log(`  TIN: ${TEST_CONFIG.oscu.tin}`);
    console.log(`  Branch ID: ${TEST_CONFIG.oscu.bhf_id}`);
    console.log(`  Device Serial: ${deviceSerial}`);
    console.log('='.repeat(70) + '\n');
  });

  // Run before each test
  beforeEach(async () => {
    // Clear cache before each test to ensure fresh tokens
    clearTokenCache(TEST_CONFIG.cache_file);
    
    // Create fresh clients
    auth = new AuthClient(TEST_CONFIG);
    etims = new EtimsClient(TEST_CONFIG, auth);
  });

  // Run after all tests
  afterAll(() => {
    // Cleanup cache file
    clearTokenCache(TEST_CONFIG.cache_file);
    console.log('\n✅ All tests completed\n');
  });

  // =================================================
  // TEST 1: AUTHENTICATION
  // =================================================
  describe('Authentication', () => {
    it('should generate access token successfully', async () => {
      const token = await auth.getToken(true); // force refresh
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
      
      console.log(`✅ Token acquired: ${token.substring(0, 15)}...`);
    });

    it('should cache token and reuse it', async () => {
      // First call - generates new token
      const token1 = await auth.getToken();
      
      // Second call - should use cached token
      const token2 = await auth.getToken();
      
      expect(token1).toBe(token2);
      
      console.log('✅ Token caching working correctly');
    });

    it('should refresh token when expired', async () => {
      // Get token
      const token1 = await auth.getToken(true);
      
      // Clear cache to simulate expiration
      await auth.clearToken();
      
      // Should generate new token
      const token2 = await auth.getToken(true);
      
      expect(token2).toBeDefined();
      expect(token2).not.toBe(token1); // New token
      
      console.log('✅ Token refresh working correctly');
    });
  });

  // =================================================
  // TEST 2: OSCU INITIALIZATION
  // =================================================
  describe('OSCU Initialization', () => {
    // it('should initialize OSCU and retrieve cmcKey', async () => {
    //   const response = await etims.selectInitOsdcInfo({
    //     tin: TEST_CONFIG.oscu.tin,
    //     bhfId: TEST_CONFIG.oscu.bhf_id,
    //     dvcSrlNo: deviceSerial,
    //   });

    //   // Validate response structure
    //   expect(response).toBeDefined();
    //   expect(response).toHaveProperty('resultCd');
      
    //   // cmcKey can be at root level or nested in data/info
    //   const extractedCmcKey = 
    //     response.cmcKey || 
    //     response.data?.cmcKey || 
    //     response.data?.info?.cmcKey;

    //   expect(extractedCmcKey).toBeDefined();
    //   expect(typeof extractedCmcKey).toBe('string');
    //   expect(extractedCmcKey.length).toBeGreaterThan(0);

    //   cmcKey = extractedCmcKey;
      
    //   console.log(`✅ OSCU initialized successfully`);
    //   console.log(`   cmcKey: ${cmcKey.substring(0, 15)}...`);
    // });

    // it('should fail with invalid device serial', async () => {
    //   await expect(
    //     etims.selectInitOsdcInfo({
    //       tin: TEST_CONFIG.oscu.tin,
    //       bhfId: TEST_CONFIG.oscu.bhf_id,
    //       dvcSrlNo: 'invalid_serial_xyz', // Invalid serial
    //     })
    //   ).rejects.toThrow(ApiException);
    // });

    // it('should fail with missing required fields', async () => {
    //   // @ts-expect-error Testing validation
    //   await expect(
    //     etims.selectInitOsdcInfo({
    //       tin: TEST_CONFIG.oscu.tin,
    //       // Missing bhf_id and dvcSrlNo
    //     })
    //   ).rejects.toThrow(ValidationException);
    // });
  });

  // =================================================
  // TEST 3: DATA MANAGEMENT ENDPOINTS
  // =================================================
  describe('Data Management Endpoints', () => {
    // Initialize OSCU before these tests
    beforeEach(async () => {
      if (!cmcKey) {
        const initResponse = await etims.selectInitOsdcInfo({
          tin: TEST_CONFIG.oscu.tin,
          bhfId: TEST_CONFIG.oscu.bhf_id,
          dvcSrlNo: deviceSerial,
        });
        
        cmcKey = initResponse.cmcKey || initResponse.data?.cmcKey || initResponse.data?.info?.cmcKey;
        TEST_CONFIG.oscu.cmc_key = cmcKey!;
        etims = new EtimsClient(TEST_CONFIG, auth); // Recreate with cmcKey
      }
    });

    it('should fetch code list successfully', async () => {
      const response = await etims.selectCodeList({
        tin: TEST_CONFIG.oscu.tin,
        bhfId: TEST_CONFIG.oscu.bhf_id,
        lastReqDt: getKraDateTime(-7), // Max 7 days old
      });

      expect(response).toBeDefined();
      expect(response.resultCd).toBe('0000');
      expect(response).toHaveProperty('itemList');
      
      const itemList = response.itemList || [];
      expect(Array.isArray(itemList)).toBe(true);
      
      console.log(`✅ Retrieved ${itemList.length} code list items`);
      
      if (itemList.length > 0) {
        // Validate first item structure
        const firstItem = itemList[0];
        expect(firstItem).toHaveProperty('cd');
        expect(firstItem).toHaveProperty('cdNm');
      }
    });

    it('should fetch taxpayer info successfully', async () => {
      const response = await etims.selectTaxpayerInfo({
        tin: TEST_CONFIG.oscu.tin,
        bhfId: TEST_CONFIG.oscu.bhf_id,
        lastReqDt: getKraDateTime(-7),
      });

      expect(response).toBeDefined();
      expect(response.resultCd).toBe('0000');
      
      console.log('✅ Taxpayer info retrieved successfully');
    });

    it('should fetch notice list successfully', async () => {
      const response = await etims.selectNoticeList({
        tin: TEST_CONFIG.oscu.tin,
        bhfId: TEST_CONFIG.oscu.bhf_id,
        lastReqDt: getKraDateTime(-7),
      });

      expect(response).toBeDefined();
      expect(response.resultCd).toBe('0000');
      
      console.log('✅ Notice list retrieved successfully');
    });

    it('should fetch customer list successfully', async () => {
      const response = await etims.selectCustomerList({
        tin: TEST_CONFIG.oscu.tin,
        bhfId: TEST_CONFIG.oscu.bhf_id,
        lastReqDt: getKraDateTime(-7),
      });

      expect(response).toBeDefined();
      expect(response.resultCd).toBe('0000');
      
      console.log('✅ Customer list retrieved successfully');
    });
  });

  // =================================================
  // TEST 4: SALES TRANSACTION
  // =================================================
  describe('Sales Transaction', () => {
    let testInvoiceNo = 1;

    // Initialize OSCU before sales tests
    beforeEach(async () => {
      if (!cmcKey) {
        const initResponse = await etims.selectInitOsdcInfo({
          tin: TEST_CONFIG.oscu.tin,
          bhfId: TEST_CONFIG.oscu.bhf_id,
          dvcSrlNo: deviceSerial,
        });
        
        cmcKey = initResponse.cmcKey || initResponse.data?.cmcKey || initResponse.data?.info?.cmcKey;
        TEST_CONFIG.oscu.cmc_key = cmcKey!;
        etims = new EtimsClient(TEST_CONFIG, auth);
      }
    });

    it('should send sales transaction with full tax breakdown', async () => {
      const now = dayjs();
      const invoiceNo = testInvoiceNo++;

      const payload = {
        invcNo: invoiceNo, // Sequential integer
        custTin: 'A123456789Z',
        custNm: 'Test Customer',
        salesTyCd: 'N', // Normal sale
        rcptTyCd: 'R', // Receipt
        pmtTyCd: '01', // Cash payment
        salesSttsCd: '01', // Completed
        cfmDt: now.format('YYYYMMDDHHmmss'), // YYYYMMDDHHmmss
        salesDt: now.format('YYYYMMDD'), // YYYYMMDD
        totItemCnt: 1,
        // ALL 15 TAX FIELDS REQUIRED
        taxblAmtA: 0.00, taxblAmtB: 0.00, taxblAmtC: 81000.00,
        taxblAmtD: 0.00, taxblAmtE: 0.00,
        taxRtA: 0.00, taxRtB: 0.00, taxRtC: 0.00,
        taxRtD: 0.00, taxRtE: 0.00,
        taxAmtA: 0.00, taxAmtB: 0.00, taxAmtC: 0.00,
        taxAmtD: 0.00, taxAmtE: 0.00,
        totTaxblAmt: 81000.00,
        totTaxAmt: 0.00,
        totAmt: 81000.00,
        regrId: 'Admin', regrNm: 'Admin',
        modrId: 'Admin', modrNm: 'Admin',
        itemList: [
          {
            itemSeq: 1,
            itemCd: 'KE2NTBA00000001', // Must exist in KRA system
            itemClsCd: '1000000000',
            itemNm: 'Brand A',
            barCd: '', // Nullable but required field
            pkgUnitCd: 'NT',
            pkg: 1,
            qtyUnitCd: 'BA',
            qty: 90.0,
            prc: 1000.00,
            splyAmt: 81000.00,
            dcRt: 0.0, // Discount rate
            dcAmt: 0.0, // Discount amount
            taxTyCd: 'C', // Zero-rated
            taxblAmt: 81000.00,
            taxAmt: 0.00,
            totAmt: 81000.00,
          },
        ],
      };

      const response = await etims.sendSalesTransaction(payload);

      expect(response).toBeDefined();
      expect(response.resultCd).toBe('0000');
      expect(response).toHaveProperty('data');
      expect(response.data).toHaveProperty('rcptSign');
      expect(response.data).toHaveProperty('invcNo', invoiceNo.toString());

      console.log(`✅ Sales transaction sent successfully`);
      console.log(`   Invoice #${invoiceNo}`);
      console.log(`   Receipt Signature: ${response.data.rcptSign.substring(0, 20)}...`);
    });

    it('should reject non-integer invoice numbers', async () => {
      const now = dayjs();
      
      // @ts-expect-error Testing validation
      const invalidPayload = {
        invcNo: 'INV001', // String instead of integer - should fail
        custTin: 'A123456789Z',
        custNm: 'Test Customer',
        salesTyCd: 'N',
        rcptTyCd: 'R',
        pmtTyCd: '01',
        salesSttsCd: '01',
        cfmDt: now.format('YYYYMMDDHHmmss'),
        salesDt: now.format('YYYYMMDD'),
        totItemCnt: 1,
        taxblAmtA: 0.00, taxblAmtB: 0.00, taxblAmtC: 81000.00,
        taxblAmtD: 0.00, taxblAmtE: 0.00,
        taxRtA: 0.00, taxRtB: 0.00, taxRtC: 0.00,
        taxRtD: 0.00, taxRtE: 0.00,
        taxAmtA: 0.00, taxAmtB: 0.00, taxAmtC: 0.00,
        taxAmtD: 0.00, taxAmtE: 0.00,
        totTaxblAmt: 81000.00,
        totTaxAmt: 0.00,
        totAmt: 81000.00,
        regrId: 'Admin', regrNm: 'Admin',
        itemList: [
          {
            itemSeq: 1,
            itemCd: 'KE2NTBA00000001',
            itemClsCd: '1000000000',
            itemNm: 'Brand A',
            qty: 90.0,
            prc: 1000.00,
            splyAmt: 81000.00,
            taxTyCd: 'C',
            taxblAmt: 81000.00,
            taxAmt: 0.00,
            totAmt: 81000.00,
          },
        ],
      };

      await expect(
        etims.sendSalesTransaction(invalidPayload)
      ).rejects.toThrow(ValidationException);
    });

    it('should reject invalid tax category codes', async () => {
      const now = dayjs();
      
      // @ts-expect-error Testing validation
      const invalidPayload = {
        invcNo: testInvoiceNo++,
        custTin: 'A123456789Z',
        custNm: 'Test Customer',
        salesTyCd: 'N',
        rcptTyCd: 'R',
        pmtTyCd: '01',
        salesSttsCd: '01',
        cfmDt: now.format('YYYYMMDDHHmmss'),
        salesDt: now.format('YYYYMMDD'),
        totItemCnt: 1,
        taxblAmtA: 0.00, taxblAmtB: 0.00, taxblAmtC: 81000.00,
        taxblAmtD: 0.00, taxblAmtE: 0.00,
        taxRtA: 0.00, taxRtB: 0.00, taxRtC: 0.00,
        taxRtD: 0.00, taxRtE: 0.00,
        taxAmtA: 0.00, taxAmtB: 0.00, taxAmtC: 0.00,
        taxAmtD: 0.00, taxAmtE: 0.00,
        totTaxblAmt: 81000.00,
        totTaxAmt: 0.00,
        totAmt: 81000.00,
        regrId: 'Admin', regrNm: 'Admin',
        itemList: [
          {
            itemSeq: 1,
            itemCd: 'KE2NTBA00000001',
            itemClsCd: '1000000000',
            itemNm: 'Brand A',
            qty: 90.0,
            prc: 1000.00,
            splyAmt: 81000.00,
            taxTyCd: 'Z', // Invalid tax category - should fail
            taxblAmt: 81000.00,
            taxAmt: 0.00,
            totAmt: 81000.00,
          },
        ],
      };

      await expect(
        etims.sendSalesTransaction(invalidPayload)
      ).rejects.toThrow(ValidationException);
    });

    it('should reject future dates', async () => {
      const futureDate = dayjs().add(1, 'day');
      
      const payload = {
        invcNo: testInvoiceNo++,
        custTin: 'A123456789Z',
        custNm: 'Test Customer',
        salesTyCd: 'N',
        rcptTyCd: 'R',
        pmtTyCd: '01',
        salesSttsCd: '01',
        cfmDt: futureDate.format('YYYYMMDDHHmmss'), // Future date - should fail
        salesDt: futureDate.format('YYYYMMDD'),
        totItemCnt: 1,
        taxblAmtA: 0.00, taxblAmtB: 0.00, taxblAmtC: 81000.00,
        taxblAmtD: 0.00, taxblAmtE: 0.00,
        taxRtA: 0.00, taxRtB: 0.00, taxRtC: 0.00,
        taxRtD: 0.00, taxRtE: 0.00,
        taxAmtA: 0.00, taxAmtB: 0.00, taxAmtC: 0.00,
        taxAmtD: 0.00, taxAmtE: 0.00,
        totTaxblAmt: 81000.00,
        totTaxAmt: 0.00,
        totAmt: 81000.00,
        regrId: 'Admin', regrNm: 'Admin',
        itemList: [
          {
            itemSeq: 1,
            itemCd: 'KE2NTBA00000001',
            itemClsCd: '1000000000',
            itemNm: 'Brand A',
            qty: 90.0,
            prc: 1000.00,
            splyAmt: 81000.00,
            taxTyCd: 'C',
            taxblAmt: 81000.00,
            taxAmt: 0.00,
            totAmt: 81000.00,
          },
        ],
      };

      await expect(
        etims.sendSalesTransaction(payload)
      ).rejects.toThrow(ApiException);
    });
  });

  // =================================================
  // TEST 5: ERROR HANDLING
  // =================================================
  describe('Error Handling', () => {
    it('should throw ApiException for business errors', async () => {
      // Try to fetch code list without cmcKey (should fail)
      const freshAuth = new AuthClient(TEST_CONFIG);
      const freshEtims = new EtimsClient(TEST_CONFIG, freshAuth);

      await expect(
        freshEtims.selectCodeList({
          tin: TEST_CONFIG.oscu.tin,
          bhfId: TEST_CONFIG.oscu.bhf_id,
          lastReqDt: getKraDateTime(-7),
        })
      ).rejects.toThrow(ApiException);
    });

    it('should provide detailed error information', async () => {
      try {
        await etims.selectCodeList({
          tin: TEST_CONFIG.oscu.tin,
          bhfId: TEST_CONFIG.oscu.bhf_id,
          lastReqDt: getKraDateTime(-7),
        });
      } catch (error) {
        if (error instanceof ApiException) {
          expect(error).toHaveProperty('errorCode');
          expect(error).toHaveProperty('message');
          expect(error).toHaveProperty('details');
          
          console.log(`✅ Error details captured:`);
          console.log(`   Code: ${error.errorCode}`);
          console.log(`   Message: ${error.message}`);
        } else {
          throw error;
        }
      }
    });
  });
});