import Joi from 'joi';
import { ValidationException } from '../exceptions/ValidationException';

type SchemaMap = Record<string, Joi.ObjectSchema<any>>;

export class Validator {
  private schemas: SchemaMap;

  constructor() {
    // CORE FIELD VALIDATORS
    const tin = Joi.string().min(1).max(20).required().label('TIN');
    const bhfId = Joi.string().min(1).max(10).required().label('Branch ID');
    const lastReqDt = Joi.string()
      .pattern(/^\d{14}$/)
      .required()
      .label('Last Request Date (YYYYMMDDHHmmss)');
    const useYn = Joi.string().valid('Y', 'N').required().label('Use 여부 (Y/N)');

    // SCHEMAS
    this.schemas = {
      /* -----------------------------
       * INITIALIZATION
       * ----------------------------- */
      initialization: Joi.object({
        tin,
        bhfId,
        dvcSrlNo: Joi.string().min(1).max(50).required().label('Device Serial Number'),
      }),

      /* -----------------------------
       * COMMON
       * ----------------------------- */
      lastReqOnly: Joi.object({
        lastReqDt,
      }),

      selectCustomer: Joi.object({
        custmTin: tin,
      }),

      /* -----------------------------
       * CUSTOMER / BRANCH
       * ----------------------------- */
      saveBhfCustomer: Joi.object({
        custNo: Joi.string().required(),
        custTin: tin,
        custNm: Joi.string().required(),
        useYn,
        regrId: Joi.string().required(),
        regrNm: Joi.string().required(),
        modrId: Joi.string().optional(),
        modrNm: Joi.string().optional(),
      }),

      saveBhfUser: Joi.object({
        userId: Joi.string().required(),
        userNm: Joi.string().required(),
        pwd: Joi.string().required(),
        useYn,
        regrId: Joi.string().required(),
        regrNm: Joi.string().required(),
        modrId: Joi.string().optional(),
        modrNm: Joi.string().optional(),
      }),

      saveBhfInsurance: Joi.object({
        isrccCd: Joi.string().required(),
        isrccNm: Joi.string().required(),
        isrcRt: Joi.number().min(0).required(),
        useYn,
        regrId: Joi.string().required(),
        regrNm: Joi.string().required(),
        modrId: Joi.string().optional(),
        modrNm: Joi.string().optional(),
      }),

      /* -----------------------------
       * ITEM
       * ----------------------------- */
      saveItem: Joi.object({
        itemCd: Joi.string().required(),
        itemClsCd: Joi.string().required(),
        itemTyCd: Joi.string().required(),
        itemNm: Joi.string().required(),
        itemStdNm: Joi.string().allow(null).optional(),
        orgnNatCd: Joi.string().min(2).max(5).required(),
        pkgUnitCd: Joi.string().required(),
        qtyUnitCd: Joi.string().required(),
        taxTyCd: Joi.string().required(),
        dftPrc: Joi.number().min(0).required(),
        grpPrcL1: Joi.number().optional(),
        grpPrcL2: Joi.number().optional(),
        grpPrcL3: Joi.number().optional(),
        grpPrcL4: Joi.number().optional(),
        grpPrcL5: Joi.number().optional(),
        btchNo: Joi.string().allow(null).optional(),
        bcd: Joi.string().allow(null).optional(),
        addInfo: Joi.string().allow(null).optional(),
        sftyQty: Joi.number().optional(),
        isrcAplcbYn: Joi.string().valid('Y', 'N').required(),
        useYn,
        regrId: Joi.string().required(),
        regrNm: Joi.string().required(),
        modrId: Joi.string().required(),
        modrNm: Joi.string().required(),
      }),

      saveItemComposition: Joi.object({
        itemCd: Joi.string().required(),
        cpstItemCd: Joi.string().required(),
        cpstQty: Joi.number().min(0.001).required(),
        regrId: Joi.string().required(),
        regrNm: Joi.string().required(),
        modrId: Joi.string().optional(),
        modrNm: Joi.string().optional(),
      }),

      updateImportItem: Joi.object({
        taskCd: Joi.string().required(),
        dclDe: Joi.string().min(8).max(14).required(),
        itemSeq: Joi.number().min(1).required(),
        hsCd: Joi.string().max(17).required(),
        itemClsCd: Joi.string().max(10).required(),
        itemCd: Joi.string().max(20).required(),
        imptItemSttsCd: Joi.string().required(),
        modrId: Joi.string().required(),
        modrNm: Joi.string().required(),
        remark: Joi.string().optional(),
      }),

      saveTrnsSalesOsdc: Joi.object({
        // -------------------- Header --------------------
        tin: Joi.string().length(11).required().label('TIN'),
        bhfId: Joi.string().length(2).required().label('Branch ID'),
        cmcKey: Joi.string().max(255).required().label('Communication Key'),

        trdInvcNo: Joi.alternatives()
          .try(Joi.string().max(50), Joi.number())
          .required()
          .label('Trader Invoice Number'),

        invcNo: Joi.number().integer().min(0).required().label('Invoice Number'),
        orgInvcNo: Joi.number().integer().min(0).required().label('Original Invoice Number'),

        custTin: Joi.string().length(11).optional().allow(null).label('Customer TIN'),
        custNm: Joi.string().max(60).optional().allow(null).label('Customer Name'),

        rcptTyCd: Joi.string().max(5).required().label('Receipt Type Code'),
        pmtTyCd: Joi.string().max(5).optional().allow(null).label('Payment Type Code'),
        salesSttsCd: Joi.string().max(5).required().label('Sales Status Code'),

        cfmDt: Joi.string().pattern(/^\d{14}$/).required().label('Confirmed Date'),
        salesDt: Joi.string().pattern(/^\d{8}$/).required().label('Sales Date'),

        stockRlsDt: Joi.string().pattern(/^\d{14}$/).optional().allow(null),
        cnclReqDt: Joi.string().pattern(/^\d{14}$/).optional().allow(null),
        cnclDt: Joi.string().pattern(/^\d{14}$/).optional().allow(null),
        rfdDt: Joi.string().pattern(/^\d{14}$/).optional().allow(null),
        rfdRsnCd: Joi.string().max(5).optional().allow(null),

        // -------------------- Totals --------------------
        totItemCnt: Joi.number().integer().min(1).required(),

        taxblAmtA: Joi.number().required(),
        taxblAmtB: Joi.number().required(),
        taxblAmtC: Joi.number().required(),
        taxblAmtD: Joi.number().required(),
        taxblAmtE: Joi.number().required(),

        taxRtA: Joi.number().required(),
        taxRtB: Joi.number().required(),
        taxRtC: Joi.number().required(),
        taxRtD: Joi.number().required(),
        taxRtE: Joi.number().required(),

        taxAmtA: Joi.number().required(),
        taxAmtB: Joi.number().required(),
        taxAmtC: Joi.number().required(),
        taxAmtD: Joi.number().required(),
        taxAmtE: Joi.number().required(),

        totTaxblAmt: Joi.number().required(),
        totTaxAmt: Joi.number().required(),
        totAmt: Joi.number().required(),

        prchrAcptcYn: Joi.string().valid('Y', 'N').required(),

        remark: Joi.string().max(400).optional().allow(null),

        // -------------------- Audit --------------------
        regrId: Joi.string().max(20).required(),
        regrNm: Joi.string().max(60).required(),
        modrId: Joi.string().max(20).required(),
        modrNm: Joi.string().max(60).required(),

        // -------------------- Receipt --------------------
        receipt: Joi.object({
          custTin: Joi.string().length(11).optional().allow(null),
          custMblNo: Joi.string().max(20).optional().allow(null),
          rcptPbctDt: Joi.string().pattern(/^\d{14}$/).required(),

          trdeNm: Joi.string().max(20).optional().allow(null),
          adrs: Joi.string().max(200).optional().allow(null),
          topMsg: Joi.string().max(20).optional().allow(null),
          btmMsg: Joi.string().max(20).optional().allow(null),

          prchrAcptcYn: Joi.string().valid('Y', 'N').required(),
        }).required(),

        // -------------------- Items --------------------
        itemList: Joi.array().items(
          Joi.object({
            itemSeq: Joi.number().integer().min(1).required(),

            itemCd: Joi.string().max(20).required(),
            itemClsCd: Joi.string().max(10).optional().allow(null),
            itemNm: Joi.string().max(200).required(),

            bcd: Joi.string().max(20).optional().allow(null),

            pkgUnitCd: Joi.string().max(5).required(),
            pkg: Joi.number().required(),

            qtyUnitCd: Joi.string().max(5).required(),
            qty: Joi.number().required(),

            prc: Joi.number().required(),
            splyAmt: Joi.number().required(),

            dcRt: Joi.number().required(),
            dcAmt: Joi.number().required(),

            isrccCd: Joi.string().max(10).optional().allow(null),
            isrccNm: Joi.string().max(100).optional().allow(null),
            isrcRt: Joi.number().optional().allow(null),
            isrcAmt: Joi.number().optional().allow(null),

            taxTyCd: Joi.string().max(5).required(),
            taxblAmt: Joi.number().required(),
            taxAmt: Joi.number().required(),
            totAmt: Joi.number().required(),
          }).unknown(false)
        ).min(1).required(),
      }).unknown(false),

      saveStockMaster: Joi.object({
        itemCd: Joi.string().min(1).max(20).required(),
        rsdQty: Joi.number().min(0).required(),
        regrId: Joi.string().required(),
        regrNm: Joi.string().required(),
        modrId: Joi.string().required(),
        modrNm: Joi.string().required(),
      }),

      insertTrnsPurchase: Joi.object({
        // -------------------- Header --------------------
        spplrTin: Joi.string().length(11).optional().allow(null),
        invcNo: Joi.number().integer().min(0).required(),
        orgInvcNo: Joi.number().integer().min(0).required(),
        spplrBhfId: Joi.string().length(2).optional().allow(null),
        spplrNm: Joi.string().max(60).optional().allow(null),
        spplrInvcNo: Joi.number().integer().min(0).optional().allow(null),

        regTyCd: Joi.string().min(1).max(5).required(),
        pchsTyCd: Joi.string().min(1).max(5).required(),
        rcptTyCd: Joi.string().min(1).max(5).required(),
        pmtTyCd: Joi.string().min(1).max(5).required(),
        pchsSttsCd: Joi.string().min(1).max(5).required(),

        // Date fields: allow 8 (YYYYMMDD) or 14 (YYYYMMDDhhmmss) chars, or null
        cfmDt: Joi.alternatives()
          .try(Joi.string().length(8), Joi.string().length(14))
          .optional()
          .allow(null),
        pchsDt: Joi.alternatives()
          .try(Joi.string().length(8), Joi.string().length(14))
          .optional()
          .allow(null),
        wrhsDt: Joi.alternatives()
          .try(Joi.string().length(8), Joi.string().length(14))
          .optional()
          .allow(null),
        cnclReqDt: Joi.alternatives()
          .try(Joi.string().length(8), Joi.string().length(14))
          .optional()
          .allow(null),
        cnclDt: Joi.alternatives()
          .try(Joi.string().length(8), Joi.string().length(14))
          .optional()
          .allow(null),
        rfdDt: Joi.alternatives()
          .try(Joi.string().length(8), Joi.string().length(14))
          .optional()
          .allow(null),

        // -------------------- Totals --------------------
        totItemCnt: Joi.number().integer().min(0).required(),

        taxblAmtA: Joi.number().required(),
        taxblAmtB: Joi.number().required(),
        taxblAmtC: Joi.number().required(),
        taxblAmtD: Joi.number().required(),
        taxblAmtE: Joi.number().required(),

        taxRtA: Joi.number().required(),
        taxRtB: Joi.number().required(),
        taxRtC: Joi.number().required(),
        taxRtD: Joi.number().required(),
        taxRtE: Joi.number().required(),

        taxAmtA: Joi.number().required(),
        taxAmtB: Joi.number().required(),
        taxAmtC: Joi.number().required(),
        taxAmtD: Joi.number().required(),
        taxAmtE: Joi.number().required(),

        totTaxblAmt: Joi.number().required(),
        totTaxAmt: Joi.number().required(),
        totAmt: Joi.number().required(),

        remark: Joi.string().max(400).optional().allow(null),

        // -------------------- Audit --------------------
        regrId: Joi.string().min(1).max(20).required(),
        regrNm: Joi.string().min(1).max(60).required(),
        modrId: Joi.string().min(1).max(20).required(),
        modrNm: Joi.string().min(1).max(60).required(),

        // -------------------- Items --------------------
        itemList: Joi.array().items(
          Joi.object({
            itemSeq: Joi.number().integer().min(1).required(),
            itemCd: Joi.string().min(1).max(20).required(),
            itemClsCd: Joi.string().min(1).max(10).required(),
            itemNm: Joi.string().min(1).max(200).required(),
            bcd: Joi.string().max(20).optional().allow(null),

            spplrItemClsCd: Joi.string().max(10).optional().allow(null),
            spplrItemCd: Joi.string().max(20).optional().allow(null),
            spplrItemNm: Joi.string().max(200).optional().allow(null),

            pkgUnitCd: Joi.string().min(1).max(5).required(),
            pkg: Joi.number().integer().required(), // assuming whole packages
            qtyUnitCd: Joi.string().min(1).max(5).required(),
            qty: Joi.number().integer().required(), // assuming whole quantities
            prc: Joi.number().required(),
            splyAmt: Joi.number().required(),
            dcRt: Joi.number().required(),
            dcAmt: Joi.number().required(),

            taxblAmt: Joi.number().required(),
            taxTyCd: Joi.string().min(1).max(5).required(),
            taxAmt: Joi.number().required(),
            totAmt: Joi.number().required(),

            itemExprDt: Joi.alternatives()
              .try(Joi.string().length(8), Joi.string().length(14))
              .optional()
              .allow(null),
          }).unknown(false) // optional: disallow extra keys
        ).required().min(1), // at least one item
      }).unknown(false),
      
      insertStockIO: Joi.object({
        // -------------------- Header --------------------
        tin: Joi.string().length(11).required(), // notEmpty + length(11)
        bhfId: Joi.string().length(2).required(),
        sarNo: Joi.number().integer().min(0).required(),
        orgSarNo: Joi.number().integer().min(0).required(),
        regTyCd: Joi.string().min(1).max(5).required(),
        
        custTin: Joi.string().length(11).optional().allow(null),
        custNm: Joi.string().max(100).optional().allow(null),
        custBhfId: Joi.string().length(2).optional().allow(null),

        sarTyCd: Joi.string().min(1).max(5).required(),
        ocrnDt: Joi.string().length(8).required(), // YYYYMMDD only (per spec: length(8,8))
        
        totItemCnt: Joi.number().integer().min(0).required(),
        totTaxblAmt: Joi.number().required(),
        totTaxAmt: Joi.number().required(),
        totAmt: Joi.number().required(),

        remark: Joi.string().max(400).optional().allow(null),

        // -------------------- Audit --------------------
        regrId: Joi.string().min(1).max(20).required(),
        regrNm: Joi.string().min(1).max(60).required(),
        modrId: Joi.string().min(1).max(20).required(),
        modrNm: Joi.string().min(1).max(60).required(),

        // -------------------- Items --------------------
        itemList: Joi.array().items(
          Joi.object({
            itemSeq: Joi.number().integer().min(1).required(),
            itemCd: Joi.string().min(1).max(20).required(),
            itemClsCd: Joi.string().min(1).max(10).required(),
            itemNm: Joi.string().min(1).max(200).required(),
            bcd: Joi.string().max(20).optional().allow(null),

            pkgUnitCd: Joi.string().min(1).max(5).required(),
            pkg: Joi.number().required(), // note: PHP uses v::number() → allow float if needed
            qtyUnitCd: Joi.string().min(1).max(5).required(),
            qty: Joi.number().required(),

            itemExprDt: Joi.string().length(8).optional().allow(null), // YYYYMMDD only

            prc: Joi.number().required(),
            splyAmt: Joi.number().required(),
            totDcAmt: Joi.number().required(),
            taxblAmt: Joi.number().required(),
            taxTyCd: Joi.string().min(1).max(5).required(),
            taxAmt: Joi.number().required(),
            totAmt: Joi.number().required(),
          }).unknown(false)
        ).required().min(1),
      }).unknown(false),
    };
  }

  validate<T extends Record<string, unknown>>(data: T, schemaName: string): T {
    const schema = this.schemas[schemaName];
    if (!schema) throw new Error(`Validation schema '${schemaName}' not defined`);

    const { error, value } = schema.validate(data, {
      abortEarly: false, // gather all errors
      allowUnknown: false, // reject unknown fields
      convert: true,
    });

    if (error) {
      // Map each error to include full field path
      const messages = error.details.map(d => {
        const path = d.path
          .map(p => (typeof p === 'number' ? `[${p}]` : p))
          .join('.');
        const key = path || '(unknown field)';
        return `${key}: ${d.message.replace(/["']/g, '')}`;
      });

      throw new ValidationException('Validation failed', messages);
    }

    return value as T;
  }
}
