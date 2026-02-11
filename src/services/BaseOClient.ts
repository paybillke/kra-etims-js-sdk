import axios, { type AxiosResponse } from 'axios';
import { AuthOClient } from './AuthOClient';
import { type OscuConfig } from '../config';
import { ApiException } from '../exceptions/ApiException';
import { AuthenticationException } from '../exceptions/AuthenticationException';

export abstract class BaseOClient {
  private static readonly endpoints: Record<string, string> = {
    selectInitOsdcInfo: '/selectInitOsdcInfo',
    selectCodeList: '/selectCodeList',
    selectCustomer: '/selectCustomer',
    selectNoticeList: '/selectNoticeList',
    selectItemClsList: '/selectItemClsList',
    selectItemList: '/selectItemList',
    saveItem: '/saveItem',
    saveItemComposition: '/saveItemComposition',
    selectBhfList: '/selectBhfList',
    saveBhfCustomer: '/saveBhfCustomer',
    saveBhfUser: '/saveBhfUser',
    saveBhfInsurance: '/saveBhfInsurance',
    selectImportItemList: '/selectImportItemList',
    updateImportItem: '/updateImportItem',
    saveTrnsSalesOsdc: '/saveTrnsSalesOsdc',
    selectTrnsPurchaseSalesList: '/selectTrnsPurchaseSalesList',
    insertTrnsPurchase: '/insertTrnsPurchase',
    selectStockMoveList: '/selectStockMoveList',
    insertStockIO: '/insertStockIO',
    saveStockMaster: '/saveStockMaster',
  };

  constructor(
    protected config: OscuConfig,
    protected auth: AuthOClient
  ) {}

  protected baseUrl(): string {
    if(this.config.env == 'sbx') {
      return 'https://etims-api-sbx.kra.go.ke/etims-api'.trim().replace(/\/+$/, '');
    } else {
      return 'https://etims-api-sbx.kra.go.ke/etims-api'.trim().replace(/\/+$/, '');
    }
  }

  protected timeout(): number {
    return (this.config.http?.timeout ?? 30) * 1000;
  }

  protected endpoint(key: string): string {
    if (key.startsWith('/')) {
      throw new ApiException(
        `Endpoint key expected, path given [${key}]. Pass endpoint keys only.`,
        500
      );
    }
    const ep = (BaseOClient.endpoints as Record<string, string>)[key];
    if (!ep) throw new ApiException(`Endpoint [${key}] not configured`, 500);
    return ep;
  }

  protected async get(endpointKey: string, query: Record<string, unknown> = {}): Promise<any> {
    return this.send('GET', endpointKey, query);
  }

  protected async post(endpointKey: string, body: Record<string, unknown> = {}): Promise<any> {
    return this.send('POST', endpointKey, body);
  }

  protected async send(method: 'GET' | 'POST', endpointKey: string, data: Record<string, unknown>): Promise<any> {
    const endpoint = this.endpoint(endpointKey);
    let response = await this.request(method, endpoint, data);

    if (this.isTokenExpired(response)) {
      await this.auth.clearToken();
      await this.auth.getToken(true); // force refresh
      response = await this.request(method, endpoint, data);
    }

    return this.unwrap(response);
  }

  protected async request(
    method: 'GET' | 'POST',
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<{ status: number; body: string; json: Record<string, any> }> {
    const url = method === 'GET' && Object.keys(data).length
      ? `${this.baseUrl()}${endpoint}?${new URLSearchParams(data as Record<string, string>).toString()}`
      : `${this.baseUrl()}${endpoint}`;

    const headers = await this.buildHeaders(endpoint);

    try {
      const response: AxiosResponse<string> = await axios({
        method,
        url,
        headers,
        timeout: this.timeout(),
        responseType: 'text',
        ...(method !== 'GET' && data ? { data: JSON.stringify(data) } : {}),
      });

      return {
        status: response.status,
        body: response.data,
        json: response.data ? JSON.parse(response.data) : {},
      };
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        const r = error.response as AxiosResponse<string>;
        return {
          status: r.status,
          body: r.data,
          json: r.data ? JSON.parse(r.data) : {},
        };
      }
      throw new ApiException(`Request failed: ${error instanceof Error ? error.message : 'unknown'}`, 500);
    }
  }

  protected async buildHeaders(endpoint: string): Promise<Record<string, string>> {
    const token = await this.auth.getToken();
    // Initialization endpoint → only auth
    if (endpoint.endsWith('/selectInitOsdcInfo')) {
      return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };
    }

    // All other endpoints → full business headers
    const { tin, bhf_id, cmc_key } = this.config.oscu || {};
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      tin: tin ?? '',
      bhfId: bhf_id ?? '',
      cmcKey: cmc_key ?? '',
    };
  }

  protected isTokenExpired(response: { status: number; json: Record<string, any> }): boolean {
    if (response.status === 401) return true;
    const fault = response.json?.fault?.faultstring ?? '';
    return /access token expired|invalid token/i.test(fault);
  }

  protected unwrap(response: { status: number; body: string; json: Record<string, any> }): any {
    const { status, json } = response;

    const resultCd = json?.resultCd;
    const resultMsg = json?.resultMsg ?? 'Unknown API response';

    // HTTP-level handling
    if (status === 401) {
      throw new AuthenticationException('Unauthorized: Invalid or expired token', 401);
    }

    if (status < 200 || status >= 300) {
      throw new ApiException(`HTTP Error (${status}): ${resultMsg}`, status);
    }

    // Business-level handling
    if (!resultCd) {
      return json; // Some endpoints may not return resultCd
    }

    switch (resultCd) {
      case '000':
      case '001':
        return json; // ✅ Success

      default:
        // Categorize errors
        if (resultCd >= '891' && resultCd <= '899') {
          throw new ApiException(
            `Client Error (${resultCd}): ${resultMsg}`,
            400,
            resultCd,
            json
          );
        }

        if (resultCd >= '900') {
          throw new ApiException(
            `Server Error (${resultCd}): ${resultMsg}`,
            500,
            resultCd,
            json
          );
        }

        // Fallback
        throw new ApiException(
          `Business Error (${resultCd}): ${resultMsg}`,
          400,
          resultCd,
          json
        );
    }
  }
}
