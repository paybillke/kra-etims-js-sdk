import axios, { type AxiosResponse } from 'axios';
import { AuthClient } from './AuthClient';
import { type KraEtimsConfig } from '../config';
import { ApiException } from '../exceptions/ApiException';
import { AuthenticationException } from '../exceptions/AuthenticationException';

export abstract class BaseClient {
  private static readonly endpoints: Record<string, string> = {
    selectInitOsdcInfo: '/selectInitOsdcInfo',
    selectCodeList: '/selectCodeList',
    selectCustomer: '/selectCustomer',
    selectNoticeList: '/selectNoticeList',
    selectItemClsList: '/selectItemClsList',
    selectItemList: '/selectItemList',
    saveItem: '/saveItem',
    SaveItemComposition: '/saveItemComposition',
    selectBhfList: '/selectBhfList',
    saveBhfCustomer: '/saveBhfCustomer',
    saveBhfUser: '/saveBhfUser',
    saveBhfInsurance: '/saveBhfInsurance',
    selectImportItemList: '/selectImportItemList',
    updateImportItem: '/updateImportItem',
    TrnsSalesSaveWrReq: '/saveTrnsSalesOsdc',
    selectTrnsPurchaseSalesList: '/selectTrnsPurchaseSalesList',
    insertTrnsPurchase: '/insertTrnsPurchase',
    selectStockMoveList: '/selectStockMoveList',
    insertStockIO: '/insertStockIO',
    saveStockMaster: '/saveStockMaster',
  };

  constructor(
    protected config: KraEtimsConfig,
    protected auth: AuthClient
  ) {}

  protected baseUrl(): string {
    return this.config.api[this.config.env].base_url.replace(/\/+$/, '');
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
    const ep = (BaseClient.endpoints as Record<string, string>)[key];
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
    const { status, body, json } = response;
    if (json.resultCd && json.resultCd !== '000') {
      throw new ApiException(json.resultMsg ?? 'KRA business error', 400, json.resultCd, json);
    }

    if (status >= 200 && status < 300) return json;
    if (status === 401) throw new AuthenticationException('Unauthorized: Invalid or expired token', 401);

    const faultMsg = json.fault?.faultstring;
    throw new ApiException(faultMsg ?? body ?? `HTTP ${status} error`, status);
  }
}
