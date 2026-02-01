export class ApiException extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public errorCode?: string | null,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiException';
    Object.setPrototypeOf(this, ApiException.prototype);
  }
}