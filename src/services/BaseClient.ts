import axios, { type AxiosResponse } from 'axios';
import { AuthClient } from './AuthClient';
import { type KraEtimsConfig } from '../config';
import { ApiException } from '../exceptions/ApiException';
import { AuthenticationException } from '../exceptions/AuthenticationException';

export abstract class BaseClient {
  protected readonly timeoutMs: number;

  constructor(
    protected config: KraEtimsConfig,
    protected auth: AuthClient
  ) {
    this.timeoutMs = (config.http?.timeout ?? 30) * 1000;
  }

  protected getBaseUrl(): string {
    return this.config.api[this.config.env].base_url.trim().replace(/\/+$/, '');
  }

  protected getEndpoint(key: string): string {
    if (key.startsWith('/')) {
      throw new ApiException(
        `Endpoint key expected, path given [${key}]. Pass endpoint keys only.`,
        500
      );
    }
    const endpoint = this.config.endpoints[key];
    if (!endpoint) {
      throw new ApiException(`Endpoint [${key}] not configured`, 500);
    }
    return endpoint;
  }

  protected async request(
    method: 'GET' | 'POST',
    endpointKey: string,
    data?: Record<string, unknown>
  ): Promise<unknown> {
    let accessToken: string;
    try {
      accessToken = await this.auth.getToken();
    } catch (error) {
      throw new AuthenticationException('Failed to obtain access token');
    }

    const endpoint = this.getEndpoint(endpointKey);
    const url = `${this.getBaseUrl()}${endpoint}`;

    // Build headers with endpoint-specific logic
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Business headers for non-initialization endpoints
    if (!endpoint.endsWith('/selectInitOsdcInfo')) {
      headers['tin'] = this.config.oscu.tin;
      headers['bhfId'] = this.config.oscu.bhf_id;
      if (this.config.oscu.cmc_key) {
        headers['cmcKey'] = this.config.oscu.cmc_key;
      }
    }

    // Prepare request config
    const axiosConfig = {
      method,
      url,
      headers,
      timeout: this.timeoutMs,
      responseType: 'text' as const, // Critical: get raw response for parsing
      ...(method === 'GET' && data && Object.keys(data).length > 0
        ? { params: data }
        : method !== 'GET' && data
        ? { data: JSON.stringify(data) }
        : {}),
    };

    try {
      const response: AxiosResponse<string> = await axios(axiosConfig);
      return this.processResponse(response, endpointKey, method, data);
    } catch (error: unknown) {
    if (endpoint.endsWith('/selectInitOsdcInfo')) {
    }
      if (axios.isAxiosError(error) && error.response) {
        return this.processResponse(
          error.response as AxiosResponse<string>,
          endpointKey,
          method,
          data
        );
      }
      throw new ApiException(
        `Request failed: ${error instanceof Error ? error.message : 'unknown'}`,
        500
      );
    }
  }

  private async processResponse(
    response: AxiosResponse<string>,
    endpointKey: string,
    method: string,
    originalData?: Record<string, unknown>
  ): Promise<unknown> {
    let jsonBody: Record<string, unknown> = {};
    try {
      jsonBody = response.data ? JSON.parse(response.data) : {};
    } catch {
      // Keep empty object on parse failure
    }

    // Handle token expiration (retry once)
    if (this.isTokenExpired(response.status, jsonBody)) {
      await this.auth.clearToken();
      try {
        await this.auth.getToken(true); // Force refresh
        return this.request(method as 'GET' | 'POST', endpointKey, originalData);
      } catch {
        throw new AuthenticationException('Token refresh failed after expiration');
      }
    }

    return this.unwrap(response.status, jsonBody, response.data);
  }

  private isTokenExpired(status: number, body: Record<string, unknown>): boolean {
    if (status === 401) return true;
    
    const faultString = (body.fault as Record<string, string>)?.faultstring || '';
    return /access token expired|invalid token/i.test(faultString);
  }

  private unwrap(
    status: number,
    json: Record<string, unknown>,
    rawBody: string
  ): unknown {
    // Handle KRA business errors
    if (json.resultCd && json.resultCd !== '0000') {
      throw new ApiException(
        (json.resultMsg as string) || 'KRA business error',
        400,
        json.resultCd as string,
        json
      );
    }

    // Handle HTTP success
    if (status >= 200 && status < 300) {
      return json;
    }

    // Handle authentication errors
    if (status === 401) {
      throw new AuthenticationException('Unauthorized: Invalid or expired token', 401);
    }

    // Generic HTTP errors
    const faultMsg = (json.fault as Record<string, string>)?.faultstring;
    const message = faultMsg || rawBody || `HTTP ${status} error`;
    throw new ApiException(message.trim(), status);
  }

  // Public convenience methods
  protected get(endpointKey: string, query?: Record<string, unknown>): Promise<unknown> {
    return this.request('GET', endpointKey, query);
  }

  protected post(endpointKey: string, body?: Record<string, unknown>): Promise<unknown> {
    return this.request('POST', endpointKey, body);
  }
}