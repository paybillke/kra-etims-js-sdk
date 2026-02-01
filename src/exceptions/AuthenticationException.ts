export class AuthenticationException extends Error {
  /**
   * HTTP status code associated with the authentication failure
   * Default: 401 (Unauthorized)
   */
  public readonly statusCode: number;

  /**
   * Optional machine-readable error code from KRA API
   * Examples: 'TOKEN_EXPIRED', 'INVALID_CREDENTIALS', 'SESSION_TERMINATED'
   */
  public readonly errorCode?: string;

  constructor(
    message: string = 'Authentication failed',
    statusCode: number = 401,
    errorCode?: string
  ) {
    super(message);
    this.name = 'AuthenticationException';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationException);
    }
    
    // ES5 prototype fix
    Object.setPrototypeOf(this, AuthenticationException.prototype);
  }

  /**
   * Check if exception indicates token expiration
   * Useful for automatic token refresh logic
   */
  isTokenExpired(): boolean {
    return (
      this.statusCode === 401 && 
      (this.errorCode === 'TOKEN_EXPIRED' || 
       /token.*expired/i.test(this.message))
    );
  }

  /**
   * Convert exception to serializable format
   * Safe for client-side consumption
   */
  toJSON(): { 
    name: string; 
    message: string; 
    statusCode: number; 
    errorCode?: string 
  } {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode
    };
  }
}