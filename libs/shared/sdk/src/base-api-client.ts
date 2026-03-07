import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const IDEMPOTENCY_HEADER = 'x-idempotency-key';

export interface BaseApiClientOptions {
  baseURL: string;
  getAccessToken?: () => string | Promise<string>;
  onRefreshToken?: () => Promise<string>;
  maxRetries?: number;
}

export class BaseApiClient {
  private readonly client: AxiosInstance;
  private readonly getAccessToken?: () => string | Promise<string>;
  private readonly onRefreshToken?: () => Promise<string>;
  private readonly maxRetries: number;

  constructor(options: BaseApiClientOptions) {
    this.getAccessToken = options.getAccessToken;
    this.onRefreshToken = options.onRefreshToken;
    this.maxRetries = options.maxRetries ?? 3;
    this.client = axios.create({
      baseURL: options.baseURL,
      timeout: 30000,
    });
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(this.attachAuth.bind(this));
    this.client.interceptors.request.use(this.attachIdempotency.bind(this));
    this.client.interceptors.response.use(
      (res) => res,
      this.handleErrorWithRetryAndRefresh.bind(this)
    );
  }

  private async attachAuth(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    if (this.getAccessToken) {
      const token = await this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  }

  private attachIdempotency(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    const method = (config.method ?? '').toUpperCase();
    if ((method === 'POST' || method === 'PUT') && !config.headers[IDEMPOTENCY_HEADER]) {
      const uuid = (config.data as { client_generated_uuid?: string })?.client_generated_uuid;
      if (uuid) {
        config.headers[IDEMPOTENCY_HEADER] = uuid;
      }
    }
    return config;
  }

  private async handleErrorWithRetryAndRefresh(error: unknown): Promise<never> {
    const config = error && typeof error === 'object' && 'config' in error
      ? (error as { config: InternalAxiosRequestConfig & { _retryCount?: number } }).config
      : undefined;
    const status = error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { status?: number } }).response?.status
      : undefined;

    if (status === 401 && this.onRefreshToken && config && !(config as { _retried?: boolean })._retried) {
      (config as { _retried?: boolean })._retried = true;
      await this.onRefreshToken();
      return this.client.request(config);
    }

    const retryCount = (config as { _retryCount?: number })?._retryCount ?? 0;
    const shouldRetry =
      retryCount < this.maxRetries &&
      status != null &&
      (status >= 500 || status === 408);
    if (shouldRetry && config) {
      (config as { _retryCount?: number })._retryCount = retryCount + 1;
      const delay = Math.min(1000 * 2 ** retryCount, 10000);
      await new Promise((r) => setTimeout(r, delay));
      return this.client.request(config);
    }

    throw error;
  }

  getClient(): AxiosInstance {
    return this.client;
  }
}
