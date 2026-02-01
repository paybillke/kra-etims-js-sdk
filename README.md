<p align="center">
  <a href="https://paybill.ke" target="_blank">
    <picture>
      <source srcset="https://paybill.ke/logo-wordmark--dark.png" media="(prefers-color-scheme: dark)" />
      <img src="https://paybill.ke/logo-wordmark--light.png" width="180" alt="Paybill Kenya Logo" />
    </picture>
  </a>
</p>

# KRA eTIMS OSCU Integration SDK (Node.js)

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-007ACC?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)
![KRA eTIMS](https://img.shields.io/badge/KRA-eTIMS_OSCU-0066CC)
![Postman Compliant](https://img.shields.io/badge/Postman-Compliant-FF6C37?logo=postman)
![Vitest Tested](https://img.shields.io/badge/Tests-Vitest-6A3399?logo=vitest)

Production-grade **TypeScript SDK** for Kenya Revenue Authority's **eTIMS OSCU** (Online Sales Control Unit) API. Built with strict Postman collection compliance, Joi validation, and enterprise-grade error handling. Fully compatible with KRA sandbox/production environments.

> ⚠️ **Critical**: Implements **OSCU specification only** (KRA-hosted). *Not compatible with legacy eTIMS API.* Requires pre-registered device serial (`dvcSrlNo`) and `cmcKey` lifecycle management.

## Author
**Bartile Emmanuel**  
📧 ebartile@gmail.com | 📱 +254757807150  
*Lead Developer, Paybill Kenya*

---

## ✨ Why This SDK?
| Feature | Implementation |
|---------|----------------|
| **TypeScript-First** | Full type safety with `KraEtimsConfig`, exported exceptions, and JSDoc |
| **Postman Perfect** | Endpoint paths/methods match KRA Postman collection *exactly* (including `/insert/stockIO`) |
| **Zero-Config Validation** | Joi schemas auto-validate payloads (throws `ValidationException`) |
| **Token Intelligence** | 60s buffer caching + auto-refresh on 401 errors |
| **Real API Tested** | Vitest suite with sandbox integration safeguards |
| **Header Precision** | Auto-injects `tin`/`bhfId`/`cmcKey` *except* on `/initialize` |

---

## 📦 Installation
```bash
npm install @paybilldev/kra-etims-sdk
# OR
yarn add @paybilldev/kra-etims-sdk
```

### Requirements
- Node.js 18+ (ESM only)
- TypeScript 5.0+ (for type safety)
- Environment variables configured (see below)

---

## ⚙️ Configuration

```ts
import { KraEtimsConfig } from '@paybilldev/kra-etims-sdk';

export const config: KraEtimsConfig = {
  env: 'sandbox', // 'sandbox' | 'production'
  cache_file: './.kra_token.json',
  
  auth: {
    sandbox: {
      token_url: 'https://sbx.kra.go.ke/v1/token/generate',
      consumer_key: process.env.KRA_CONSUMER_KEY!,
      consumer_secret: process.env.KRA_CONSUMER_SECRET!,
    },
    production: {
      token_url: 'https://kra.go.ke/v1/token/generate',
      consumer_key: process.env.KRA_PROD_CONSUMER_KEY!,
      consumer_secret: process.env.KRA_PROD_CONSUMER_SECRET!,
    }
  },
  
  api: {
    sandbox: { base_url: 'https://sbx.kra.go.ke/etims-oscu/api/v1' },
    production: { base_url: 'https://api.developer.go.ke/etims-oscu/api/v1' }
  },
  
  oscu: {
    tin: process.env.KRA_TIN!,
    bhf_id: process.env.KRA_BHF_ID!,
    // cmc_key populated AFTER initialization
  },
  
  endpoints: {
    // EXACT Postman collection paths (critical for nested routes)
    initialize: '/initialize',
    insertStockIO: '/insert/stockIO',    // ← slash in path
    saveStockMaster: '/save/stockMaster', // ← slash in path
    // ... all 20+ endpoints (see src/config.ts)
  },
  
  http: { timeout: 30 } // seconds
};
```

> 💡 **Pro Tip**: Use `.trim()` on all URLs in config (KRA rejects trailing spaces)

---

## 🚀 Usage Guide
### Step 1: Initialize Clients
```ts
import { AuthClient, EtimsClient, ApiException, ValidationException } from '@paybilldev/kra-etims-sdk';
import { config } from './config';

const auth = new AuthClient(config);
const etims = new EtimsClient(config, auth);
```

### Step 2: Authenticate + Initialize OSCU (Critical!)
```ts
try {
  // 1. Get access token (auto-cached with 60s buffer)
  await auth.getToken(); 

  // 2. Initialize OSCU with KRA-approved device serial
  const initResp = await etims.initialize({
    tin: config.oscu.tin,
    bhfId: config.oscu.bhf_id,
    dvcSrlNo: process.env.KRA_DEVICE_SERIAL!.trim() // ← MUST be pre-registered
  });

  // 3. Extract cmcKey (sandbox returns at root level)
  const cmcKey = (initResp as any).cmcKey || (initResp as any).data?.cmcKey;
  if (!cmcKey) throw new Error('cmcKey missing in initialization response');

  // 4. UPDATE CONFIG & RECREATE CLIENT (critical for header injection)
  config.oscu.cmc_key = cmcKey;
  const etimsWithCmc = new EtimsClient(config, auth); // Fresh client with cmcKey

  console.log(`✅ OSCU ready | cmcKey: ${cmcKey.substring(0, 12)}...`);
} catch (error) {
  if (error instanceof ApiException && error.errorCode === '901') {
    console.error('❌ DEVICE NOT VALID (resultCd 901)');
    console.error('→ Serial not registered with KRA sandbox');
    console.error('→ Email timsupport@kra.go.ke with: "Request OSCU Sandbox Credentials - [Your Company]"');
    process.exit(1);
  }
  throw error;
}
```

### Step 3: Send Sales Transaction (Postman-Perfect Payload)
```ts
// Helper: Generate KRA-compliant date strings
const kraDate = (daysOffset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHmmss
};

try {
  const resp = await etimsWithCmc.sendSalesTransaction({
    invcNo: Math.floor(Date.now() / 1000), // ← INTEGER sequential (NOT string!)
    orgInvcNo: 0,
    custTin: 'P051777777Z',
    custNm: 'Test Customer',
    salesTyCd: 'N',
    rcptTyCd: 'R',
    pmtTyCd: '01',
    salesSttsCd: '01',
    cfmDt: kraDate(),        // YYYYMMDDHHmmss
    salesDt: kraDate().slice(0, 8), // YYYYMMDD (NO time)
    stockRlsDt: kraDate(),
    totItemCnt: 1,
    
    // ALL 15 TAX FIELDS REQUIRED (KRA validation)
    taxblAmtA: 0.00, taxblAmtB: 0.00, taxblAmtC: 81000.00, taxblAmtD: 0.00, taxblAmtE: 0.00,
    taxRtA: 0.00, taxRtB: 0.00, taxRtC: 0.00, taxRtD: 0.00, taxRtE: 0.00,
    taxAmtA: 0.00, taxAmtB: 0.00, taxAmtC: 0.00, taxAmtD: 0.00, taxAmtE: 0.00,
    totTaxblAmt: 81000.00,
    totTaxAmt: 0.00,
    totAmt: 81000.00,
    
    prchrAcptcYn: 'N',
    remark: 'Node.js SDK test',
    regrId: 'Admin', regrNm: 'Admin',
    modrId: 'Admin', modrNm: 'Admin',
    
    receipt: {
      custTin: 'P051777777Z',
      rptNo: 1,
      rcptPbctDt: kraDate(),
      trdeNm: 'Shopwithus',
      adrs: 'Westlands, Nairobi',
      topMsg: 'Thank you',
      btmMsg: 'Welcome again',
      prchrAcptcYn: 'N'
    },
    
    itemList: [{
      itemSeq: 1,
      itemCd: 'KE2NTBA00000001', // Must exist in KRA system
      itemClsCd: '1000000000',
      itemNm: 'Test Item',
      barCd: '',
      pkgUnitCd: 'NT',
      pkg: 1,
      qtyUnitCd: 'BA',
      qty: 90.0,
      prc: 1000.00,
      splyAmt: 81000.00,
      dcRt: 10.0,
      dcAmt: 9000.00,
      taxTyCd: 'C', // Zero-rated
      taxblAmt: 81000.00,
      taxAmt: 0.00,
      totAmt: 81000.00
    }]
  });

  console.log(`✅ Invoice ${resp.invcNo} signed | QR: ${resp.data.rcptSign}`);
} catch (error) {
  if (error instanceof ValidationException) {
    console.error('❌ Validation failed:');
    error.getErrors().forEach(err => console.error(`  • ${err}`));
  } else if (error instanceof ApiException) {
    console.error(`❌ KRA Error ${error.errorCode}: ${error.message}`);
    console.error('Full response:', error.details);
  }
  throw error;
}
```

---

## 📚 API Reference
### Core Classes
| Class | Purpose | Key Methods |
|-------|---------|-------------|
| `AuthClient` | Token lifecycle | `getToken(forceRefresh)`, `clearToken()` |
| `EtimsClient` | Business endpoints | `initialize()`, `sendSalesTransaction()`, `selectCodeList()`, `insertStockIO()` |
| `Validator` | Payload validation | Auto-invoked (Joi schemas) |
| `BaseClient` | HTTP/header mgmt | Internal (handles cmcKey injection) |

### Critical Endpoints (Postman-Aligned)
```ts
// Data Management
etims.selectCodeList({ tin, bhfId, lastReqDt })
etims.selectTaxpayerInfo({ tin, bhfId, lastReqDt })

// Sales & Purchases
etims.sendSalesTransaction(payload) // ← Full tax breakdown required
etims.sendPurchaseTransactionInfo(payload)

// Stock (NESTED PATHS - critical!)
etims.insertStockIO(payload)      // POST /insert/stockIO
etims.saveStockMaster(payload)    // POST /save/stockMaster

// Branch Management
etims.branchInsuranceInfo(payload)
etims.branchUserAccount(payload)
```

> 💡 **Header Intelligence**:  
> - `/initialize` → **NO** `tin`/`bhfId`/`cmcKey` headers  
> - All other endpoints → Auto-injects `tin`, `bhfId`, `cmcKey`  
> - Token auto-refreshed on 401 errors

---

## 🚨 Error Handling Patterns
```ts
import { 
  ApiException, 
  AuthenticationException, 
  ValidationException 
} from '@paybilldev/kra-etims-sdk';

try {
  await etims.sendSalesTransaction(payload);
} catch (error) {
  // Validation failures (Joi schema)
  if (error instanceof ValidationException) {
    error.getErrors().forEach(console.error); // ["invcNo must be integer", ...]
  }
  
  // KRA business errors (resultCd !== '0000')
  else if (error instanceof ApiException) {
    switch (error.errorCode) {
      case '901': 
        console.error('Device serial not registered with KRA');
        break;
      case '902':
        console.error('cmcKey expired - reinitialize OSCU');
        break;
      case '500':
        console.error('Invalid payload - check date formats/tax fields');
        break;
    }
  }
  
  // Token/authentication failures
  else if (error instanceof AuthenticationException) {
    if (error.isTokenExpired()) {
      await auth.getToken(true); // Force refresh
      // Retry operation...
    }
  }
  
  throw error; // Re-throw for upstream handling
}
```

### Common KRA Error Codes
| Code | Meaning | Solution |
|------|---------|----------|
| `901` | Invalid device serial | Use KRA-approved `dvcSrlNo` (email timsupport@kra.go.ke) |
| `902` | Invalid cmcKey | Re-initialize OSCU to get fresh key |
| `500` | Payload validation failed | Check date formats (`YYYYMMDD`), tax fields, integer invoice numbers |
| `401` | Token expired | SDK auto-refreshes; verify consumer credentials |

---

## 🔑 Critical Requirements (Non-Negotiable)
1. **Device Serial**  
   Must be pre-registered with KRA sandbox. Common test values: `dvcv1130`, `KRACU013000001`  
   → *Dynamic generation fails with `resultCd: 901`*

2. **cmcKey Lifecycle**  
   ```ts
   // AFTER initialization:
   config.oscu.cmc_key = extractedCmcKey;
   const NEW_CLIENT = new EtimsClient(config, auth); // MUST recreate client
   ```

3. **Invoice Numbers**  
   Must be **sequential integers** (1, 2, 3...) - *NOT strings* (`INV001` fails)

4. **Date Formats**  
   - `salesDt`: `YYYYMMDD` (8 digits)  
   - `cfmDt`, `rcptPbctDt`: `YYYYMMDDHHmmss` (14 digits)  
   → Use helper function `kraDate()` shown above

5. **Tax Fields**  
   All 15 fields required: `taxblAmtA-E`, `taxRtA-E`, `taxAmtA-E`  
   → Zero values permitted but *must be present*

---

## 📌 Troubleshooting
| Symptom | Solution |
|---------|----------|
| `resultCd: 901` | Device serial not registered. Email KRA with subject: `"Request OSCU Sandbox Credentials - [Your Company] - PIN: [Your PIN]"` |
| `cmcKey undefined` | Sandbox returns `cmcKey` at root level; production may nest in `data`. Use: `(resp as any).cmcKey \|\| (resp as any).data?.cmcKey` |
| `401 Unauthorized` | Consumer key/secret invalid OR token expired. Verify `.trim()` on credentials. SDK auto-refreshes tokens. |
| `resultCd: 500` on dates | Future dates rejected. Use `kraDate(-1)` for `lastReqDt` (max 7 days old) |
| Trailing space errors | Always `.trim()` URLs in config: `token_url: 'https://...'.trim()` |

---

## 🌐 Support
| Channel | Purpose | Contact |
|---------|---------|---------|
| **SDK Issues** | Bugs, PRs, TypeScript types | [GitHub Issues](https://github.com/paybillke/kra-etims-js-sdk/issues) |
| **KRA Sandbox** | Device registration, credentials | `timsupport@kra.go.ke` |
| **API Specs** | Postman collection, endpoint changes | `apisupport@kra.go.ke` |
| **Urgent Integration** | Production deployment blocking | +254757807150 (Bartile) |

> ℹ️ **Disclaimer**: This SDK is not officially endorsed by Kenya Revenue Authority. Verify all requirements with KRA before deployment. Monitor [GavaConnect Portal](https://developer.go.ke) for API updates.

---

## 📜 License
MIT License  
Copyright © 2024-2026 Bartile Emmanuel / Paybill Kenya  
*(Full license text identical to PHP SDK version)*

---

> 🇰🇪 **Proudly Made in Kenya**  
> Supporting digital tax compliance for East Africa's largest economy.  
> *Tested on KRA Sandbox • Built with TypeScript • Deployed in Production*
