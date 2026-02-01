export class ValidationException extends Error {
  /**
   * Array of human-readable validation error messages
   * Format: ["Field X is required", "Field Y must be a number", ...]
   */
  public readonly errors: string[];

  constructor(
    message: string = 'Validation failed',
    errors: string[] = []
  ) {
    super(message);
    this.name = 'ValidationException';
    this.errors = errors;
    
    // Maintain proper stack trace (critical for debugging)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationException);
    }
    
    // ES5 prototype fix for instanceof checks
    Object.setPrototypeOf(this, ValidationException.prototype);
  }

  /**
   * Get validation errors as structured array
   * @returns Array of error messages
   */
  getErrors(): string[] {
    return this.errors;
  }

  /**
   * Convert exception to serializable format
   * Useful for API responses or logging
   */
  toJSON(): { 
    name: string; 
    message: string; 
    errors: string[]; 
    stack?: string 
  } {
    return {
      name: this.name,
      message: this.message,
      errors: this.errors,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}