export interface OscuConfig {
  env: 'sbx' | 'prod'; // Enforce valid environments
  auth: {
    sbx: {
      consumer_key: string;
      consumer_secret: string;
    };
    prod: {
      consumer_key: string;
      consumer_secret: string;
    };
  };
  oscu: {
    tin: string;
    bhf_id: string;
    cmc_key?: string;
  };
  cache_file?: string;
  http?: {
    timeout?: number; // seconds
  };
}