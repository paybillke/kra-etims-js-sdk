<p align="center">
  <a href="https://paybill.ke" target="_blank">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://paybill.ke/logo-wordmark--dark.png">
      <img src="https://paybill.ke/logo-wordmark--light.png" width="180" alt="Paybill Kenya Logo">
    </picture>
  </a>
</p>

# KRA eTIMS OSCU Integration SDK (JavaScript/TypeScript)

![Node.js](https://img.shields.io/badge/Node.js-16%2B-green?logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)
![KRA eTIMS](https://img.shields.io/badge/KRA-eTIMS_OSCU-0066CC)
![Postman Compliant](https://img.shields.io/badge/Postman-Compliant-FF6C37?logo=postman)
![Jest Tested](https://img.shields.io/badge/Tests-Jest-994250?logo=jest)
![Joi Validated](https://img.shields.io/badge/Validation-Joi-8C5A9D?logo=joi)

A production-ready **TypeScript SDK** for integrating with the Kenya Revenue Authority (KRA) **eTIMS OSCU** (Online Sales Control Unit) API. Built to match the official Postman collection specifications with strict header compliance, token management, and comprehensive Joi validation.

> ⚠️ **Critical Note**: This SDK implements the **OSCU specification**.

---

## Author
**Bartile Emmanuel**  
📧 ebartile@gmail.com | 📱 +254757807150  
*Lead Developer, Paybill Kenya*

---

## Table of Contents
- [Introduction to eTIMS OSCU](#introduction-to-etims-oscu)
- [OSCU vs VSCU](#oscu-vs-vscu)
- [Critical Requirements](#critical-requirements)
- [Features](#features)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Error Handling](#error-handling)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [License](#license)

---

## Introduction to eTIMS OSCU

KRA's **Electronic Tax Invoice Management System (eTIMS)** uses **OSCU** (Online Sales Control Unit) – a KRA-hosted software module that validates and signs tax invoices in real-time before issuance.

Unlike VSCU, OSCU requires:
- Pre-registered device serial numbers (`dvcSrlNo`)
- Communication key (`cmcKey`) lifecycle management
- Strict payload schema compliance per KRA specifications

---

## Critical Requirements

### 1. ✅ Correct API URLs
Use these **exact** endpoints:

```ts
// SANDBOX
token_url: 'https://etims-api-sbx.kra.go.ke/v1/token/generate',
base_url: 'https://etims-api-sbx.kra.go.ke/etims-api',

// PRODUCTION
token_url: 'https://etims-api.kra.go.ke/v1/token/generate',
base_url: 'https://etims-api.kra.go.ke/etims-api',
```

### 2. ✅ Device Serial (`dvcSrlNo`)
- Must be **pre-approved by KRA**
- Common sandbox test value: `dvcv1130`
- Dynamic or unregistered serials → `resultCd: 901`

### 3. ✅ `cmcKey` Lifecycle
- Initialize **once** via `selectInitOsdcInfo`
- Inject into config as `cmc_key` (**underscore!**)
- Recreate client after setting `cmc_key`

### 4. ✅ Invoice Numbers
- Must be **integers** (e.g., `1`, `2`, `100`)
- ❌ Never use strings like `"INV001"`

### 5. ✅ Date Formats
- Short dates: `YYYYMMDD` (e.g., `20260131`)
- Full timestamps: `YYYYMMDDHHmmss` (e.g., `20260131143022`)

---

## Installation

```bash
npm install @paybilldev/kra-etims-sdk
```

**Requirements**: Node.js 16+, TypeScript 5.0+

---

## Configuration

```ts
const config = {
  env: 'sandbox', // or 'production'
  cache_file: './.kra_token.json',

  auth: {
    sandbox: {
      token_url: 'https://etims-api-sbx.kra.go.ke/v1/token/generate',
      consumer_key: process.env.KRA_CONSUMER_KEY!,
      consumer_secret: process.env.KRA_CONSUMER_SECRET!,
    },
    production: {
      token_url: 'https://etims-api.kra.go.ke/v1/token/generate',
      consumer_key: process.env.KRA_PROD_CONSUMER_KEY!,
      consumer_secret: process.env.KRA_PROD_CONSUMER_SECRET!,
    }
  },

  api: {
    sandbox: { base_url: 'https://etims-api-sbx.kra.go.ke/etims-api' },
    production: { base_url: 'https://etims-api.kra.go.ke/etims-api' }
  },

  oscu: {
    tin: process.env.KRA_TIN!,
    bhf_id: process.env.KRA_BHF_ID || '01',   // underscore!
    cmc_key: process.env.CMC_KEY,             // set AFTER init
    device_serial: process.env.DEVICE_SERIAL!, // e.g., 'dvcv1130'
  },
};
```

> 🔑 **All config keys use underscores**: `bhf_id`, `cmc_key`, `cache_file`

---

## Usage Guide

### Step 1: Initialize & Authenticate
```ts
import { AuthClient, EtimsClient } from '@paybilldev/kra-etims-sdk';

const auth = new AuthClient(config);
const etims = new EtimsClient(config, auth);

await auth.getToken(); // auto-cached
```

### Step 2: OSCU Initialization (Critical!)
```ts
const initResponse = await etims.selectInitOsdcInfo({
  tin: config.oscu.tin,
  bhf_id: config.oscu.bhf_id,
  dvcSrlNo: config.oscu.device_serial,
});

// Extract cmcKey (sandbox returns at root)
const cmcKey = initResponse.cmcKey || initResponse.data?.cmcKey;

// Update config IMMEDIATELY
config.oscu.cmc_key = cmcKey; // underscore!

// Recreate client to inject cmcKey into headers
const etims = new EtimsClient(config, auth);
```

### Step 3: Make Business Calls
```ts
const sales = await etims.sendSalesTransaction({
  invcNo: 1, // integer!
  custTin: 'A000123456B',
  salesDt: '20260131',
  cfmDt: '20260131143022',
  // ... full tax breakdown (A/B/C/D/E)
});
```

---

## Error Handling

| Code | Meaning | Fix |
|------|--------|-----|
| `901` | Invalid device | Use KRA-approved `dvcSrlNo` |
| `902` | Invalid `cmcKey` | Re-initialize OSCU |
| `500` | Invalid payload | Check dates, tax fields, invoice number |
| `401` | Auth failed | Refresh token |

Use typed exceptions:
```ts
catch (e) {
  if (e instanceof ValidationException) { /* ... */ }
  if (e instanceof ApiException && e.errorCode === '901') { /* ... */ }
}
```

---

## Troubleshooting

### ❌ "It is not valid device" (901)
→ Email `timsupport@kra.go.ke` for sandbox credentials. Use static serial like `dvcv1130`.

### ❌ Headers missing (`tin`, `bhfId`, `cmcKey`)
→ Ensure config uses **underscores**: `bhf_id`, `cmc_key` — **not camelCase**.

### ❌ Trailing spaces in URLs
→ Always `.trim()` or copy-paste clean URLs (fixed in this README).

---

## Support

- **KRA Sandbox Issues**: `timsupport@kra.go.ke`
- **API Technical Help**: `apisupport@kra.go.ke`
- **SDK Issues**: [GitHub Issues](https://github.com/paybillke/kra-etims-js-sdk/issues)
- **Direct Contact**: ebartile@gmail.com | +254757807150

> ℹ️ This SDK is **not officially endorsed by KRA**. Verify all requirements via [GavaConnect Developer Portal](https://developer.go.ke).

---

## License

MIT © 2024–2026 Bartile Emmanuel / Paybill Kenya

> 🇰🇪 **Proudly Made in Kenya** – Supporting digital tax compliance for East Africa.
