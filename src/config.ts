export interface AuthConfig {
  consumer_key: string;
  consumer_secret: string;
  token_url: string;
}

export interface ApiConfig {
  base_url: string;
}

export interface OscuConfig {
  tin: string;
  bhf_id: string;
  cmc_key?: string;
}

export interface KraEtimsConfig {
  env: 'sandbox' | 'production'; // Enforce valid environments
  auth: {
    sandbox: AuthConfig;
    production: AuthConfig;
  };
  api: {
    sandbox: ApiConfig;
    production: ApiConfig;
  };
  oscu: OscuConfig;
  cache_file?: string;
  http?: {
    timeout?: number; // seconds
  };
}