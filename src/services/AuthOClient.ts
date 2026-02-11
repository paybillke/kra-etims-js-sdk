import axios from 'axios';
import { TokenCacheManager, type TokenCache } from '../utils/cache';
import { type OscuConfig } from '../config';
import { ApiException } from '../exceptions/ApiException';

export class AuthOClient {
  private cacheManager: TokenCacheManager;
  private readonly timeout: number;

  constructor(private config: OscuConfig) {
    this.cacheManager = new TokenCacheManager(config.cache_file);
    this.timeout = (config.http?.timeout ?? 15) * 1000; // Convert to ms
  }

  async getToken(forceRefresh: boolean = false): Promise<string> {
    if (!forceRefresh) {
      const cached = await this.cacheManager.read();
      if (cached && Date.now() < cached.expires_at * 1000) {
        return cached.access_token;
      }
    }

    const tokenData = await this.fetchToken();
    if (!tokenData.access_token) {
      throw new ApiException('Invalid token response from KRA', 500);
    }

    const expiresIn = parseInt(tokenData.expires_in ?? '3600', 10);
    await this.cacheManager.write({
      access_token: tokenData.access_token,
      expires_at: Math.floor(Date.now() / 1000) + expiresIn - 60, // 60s buffer
    });

    return tokenData.access_token;
  }

  async clearToken(): Promise<void> {
    await this.cacheManager.clear();
  }

  private async fetchToken(): Promise<Record<string, string>> {
    const envConfig = this.config.auth[this.config.env];
    if (!envConfig?.consumer_key || !envConfig?.consumer_secret) {
      throw new ApiException(`Auth config missing for env [${this.config.env}]`, 500);
    }

    const authHeader = Buffer.from(
      `${envConfig.consumer_key}:${envConfig.consumer_secret}`
    ).toString('base64');

    const token_url = 'https://api.kra.go.ke/v1/token/generate'.trim();

    if(this.config.env == 'sbx') {
      'https://sbx.kra.go.ke/v1/token/generate'.trim();
    } 

    try {
      const response = await axios.get(
        `${token_url.trim().replace(/\/+$/, '')}?grant_type=client_credentials`,
        {
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Accept': 'application/json',
          },
          timeout: this.timeout,
          responseType: 'json',
        }
      );

      // Handle KRA-specific error format
      if (response.data?.errorCode) {
        throw new ApiException(
          response.data.errorMessage || 'Authentication failed',
          400,
          response.data.errorCode
        );
      }

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.errorMessage 
          || error.message 
          || 'Token request failed';
        throw new ApiException(msg, error.response?.status || 500);
      }
      throw new ApiException('Unexpected error during token fetch', 500);
    }
  }
}
