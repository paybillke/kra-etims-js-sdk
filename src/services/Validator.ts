import Joi from 'joi';
import { ValidationException } from '../exceptions/ValidationException';

type SchemaMap = Record<string, Joi.ObjectSchema>;

export class Validator {
  private schemas: SchemaMap;

  constructor() {
    /**
     * =========================
     * CORE FIELD VALIDATORS
     * =========================
     */
    const tin = Joi.string()
      .min(1)
      .max(20)
      .required()
      .label('TIN');

    const bhfId = Joi.string()
      .min(1)
      .max(10)
      .required()
      .label('Branch ID');

    const lastReqDt = Joi.string()
      .pattern(/^\d{14}$/)
      .required()
      .label('Last Request Date (YYYYMMDDHHmmss)');

    const useYn = Joi.string()
      .valid('Y', 'N')
      .required()
      .label('Use 여부 (Y/N)');

    /**
     * =========================
     * SCHEMAS
     * =========================
     */
    this.schemas = {
      /**
       * INITIALIZATION
       * (ONLY these 3 fields allowed)
       */
      initialization: Joi.object({
        tin,
        bhfId,
        dvcSrlNo: Joi.string()
          .min(1)
          .max(50)
          .required()
          .label('Device Serial Number'),
      }),

      /**
       * DATA MANAGEMENT
       */
      codeList: Joi.object({
        tin,
        bhfId,
        lastReqDt,
      }),

      itemClsList: Joi.object({
        tin,
        bhfId,
        lastReqDt,
      }),

      bhfList: Joi.object({
        lastReqDt,
      }),

      noticeList: Joi.object({
        tin,
        bhfId,
        lastReqDt,
      }),

      taxpayerInfo: Joi.object({
        tin,
        bhfId,
        lastReqDt,
      }),

      customerList: Joi.object({
        tin,
        bhfId,
        lastReqDt,
      }),

      /**
       * =========================
       * BRANCH MANAGEMENT
       * =========================
       */
      branchInsurance: Joi.object({
        isrccCd: Joi.string().required(),
        isrccNm: Joi.string().required(),
        isrcRt: Joi.number().min(0).required(),
        useYn,
        regrNm: Joi.string().required(),
        regrId: Joi.string().required(),
      }),

      branchUserAccount: Joi.object({
        userId: Joi.string().required(),
        userNm: Joi.string().required(),
        pwd: Joi.string().required(),
        useYn,
        regrNm: Joi.string().required(),
        regrId: Joi.string().required(),
      }),

      customerInfo: Joi.object({
        custNo: Joi.string().required(),
        custTin: Joi.string().required(),
        custNm: Joi.string().required(),
        useYn,
        regrNm: Joi.string().required(),
        regrId: Joi.string().required(),
      }),

      /**
       * =========================
       * SALES TRANSACTION
       * =========================
       */
      salesTransaction: Joi.object({
        invcNo: Joi.number().integer().min(1).required(),
        custTin: Joi.string().required(),
        custNm: Joi.string().required(),

        salesTyCd: Joi.string()
          .valid('N', 'R')
          .required(),

        rcptTyCd: Joi.string()
          .valid('R', 'P', 'C')
          .required(),

        pmtTyCd: Joi.string()
          .pattern(/^\d{2}$/)
          .required(),

        salesSttsCd: Joi.string()
          .valid('01', '02', '03')
          .required(),

        cfmDt: Joi.string()
          .pattern(/^\d{14}$/)
          .required(),

        salesDt: Joi.string()
          .pattern(/^\d{8}$/)
          .required(),

        totItemCnt: Joi.number().integer().min(1).required(),
        totTaxblAmt: Joi.number().min(0).required(),
        totTaxAmt: Joi.number().min(0).required(),
        totAmt: Joi.number().min(0).required(),

        regrId: Joi.string().required(),
        regrNm: Joi.string().required(),

        itemList: Joi.array()
          .items(
            Joi.object({
              itemSeq: Joi.number().integer().min(1).required(),
              itemCd: Joi.string().required(),
              itemClsCd: Joi.string().required(),
              itemNm: Joi.string().required(),
              qty: Joi.number().min(0.001).required(),
              prc: Joi.number().min(0).required(),
              splyAmt: Joi.number().min(0).required(),
              taxTyCd: Joi.string()
                .valid('A', 'B', 'C', 'D', 'E')
                .required(),
              taxblAmt: Joi.number().min(0).required(),
              taxAmt: Joi.number().min(0).required(),
              totAmt: Joi.number().min(0).required(),
            })
          )
          .min(1)
          .required(),
      }),
    };
  }

  /**
   * =========================
   * VALIDATE
   * =========================
   */
  validate<T extends Record<string, unknown>>(
    data: T,
    schemaName: string
  ): T {
    const schema = this.schemas[schemaName];

    if (!schema) {
      throw new Error(`Validation schema '${schemaName}' not defined`);
    }

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      convert: true,
      allowUnknown: false,
      messages: {
        'any.required': '{{#label}} is required',
        'string.empty': '{{#label}} must not be empty',
        'string.pattern.base': '{{#label}} has invalid format',
        'number.min': '{{#label}} must be greater than or equal to {{#limit}}',
      },
    });

    if (error) {
      const messages = error.details.map(d => d.message);
      throw new ValidationException('Validation failed', messages);
    }

    return value as T;
  }
}
