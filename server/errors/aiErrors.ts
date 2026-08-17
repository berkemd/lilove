export class AIError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly metadata?: any;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    retryable: boolean = false,
    metadata?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.metadata = metadata;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      retryable: this.retryable,
      metadata: this.metadata
    };
  }
}

export class AIRateLimitError extends AIError {
  public readonly retryAfter: number;
  public readonly provider: string;

  constructor(provider: string, retryAfter: number = 60) {
    super(
      `AI rate limit exceeded for ${provider}. Please try again in ${retryAfter} seconds.`,
      'AI_RATE_LIMIT',
      429,
      true,
      { provider, retryAfter }
    );
    this.retryAfter = retryAfter;
    this.provider = provider;
  }

  getGracefulMessage(): string {
    return `You're getting great use out of your AI mentor! To ensure quality for everyone, we've temporarily limited requests. Your chat will be ready in ${this.retryAfter} seconds. ⏱️`;
  }
}

export class AIProviderError extends AIError {
  public readonly provider: string;
  public readonly originalError?: string;

  constructor(provider: string, originalError?: any) {
    const errorDetails = originalError?.message || 'Unknown error';
    super(
      `AI provider ${provider} is temporarily unavailable: ${errorDetails}`,
      'AI_PROVIDER_ERROR',
      503,
      true,
      { provider, originalError: errorDetails }
    );
    this.provider = provider;
    this.originalError = errorDetails;
  }

  getGracefulMessage(fallbackAvailable: boolean = false): string {
    if (fallbackAvailable) {
      return `Our primary AI is taking a quick break. We've switched to our backup system to keep helping you! 🔄`;
    }
    return `Our AI mentor is temporarily unavailable. We're working to restore service. Please try again in a few moments. 🛠️`;
  }
}

export class AIConfigError extends AIError {
  constructor(missingConfig: string) {
    super(
      `AI configuration error: ${missingConfig} is not configured`,
      'AI_CONFIG_ERROR',
      500,
      false,
      { missingConfig }
    );
  }

  getGracefulMessage(): string {
    return `AI features are being configured. Some advanced features may be temporarily unavailable. Please contact support if this persists. ⚙️`;
  }
}

export class AIQuotaError extends AIError {
  public readonly resetAt?: Date;

  constructor(provider: string, resetAt?: Date) {
    const resetInfo = resetAt ? ` Quota resets at ${resetAt.toLocaleTimeString()}` : '';
    super(
      `AI quota exceeded for ${provider}.${resetInfo}`,
      'AI_QUOTA_ERROR',
      429,
      true,
      { provider, resetAt: resetAt?.toISOString() }
    );
    this.resetAt = resetAt;
  }

  getGracefulMessage(): string {
    const resetInfo = this.resetAt 
      ? ` Your quota refreshes at ${this.resetAt.toLocaleTimeString()}.`
      : ' Your quota will refresh soon.';
    return `You've reached your AI chat limit for today.${resetInfo} Consider upgrading for unlimited access! 🚀`;
  }
}

export class AIContentFilterError extends AIError {
  constructor(reason?: string) {
    super(
      `AI content was filtered${reason ? `: ${reason}` : ''}`,
      'AI_CONTENT_FILTER',
      400,
      false,
      { reason }
    );
  }

  getGracefulMessage(): string {
    return `Your message couldn't be processed due to content guidelines. Please rephrase and try again. 🙏`;
  }
}

export class AITimeoutError extends AIError {
  constructor(provider: string, timeoutMs: number) {
    super(
      `AI request to ${provider} timed out after ${timeoutMs}ms`,
      'AI_TIMEOUT',
      504,
      true,
      { provider, timeoutMs }
    );
  }

  getGracefulMessage(): string {
    return `Your AI mentor is thinking hard but taking longer than usual. Please try again! 🤔`;
  }
}

export function handleAIError(error: any): {
  error: AIError;
  shouldFallback: boolean;
  gracefulMessage: string;
} {
  let aiError: AIError;
  let shouldFallback = false;

  if (error instanceof AIError) {
    aiError = error;
  } else if (error.code === 'insufficient_quota' || error.status === 429) {
    aiError = new AIQuotaError('openai');
    shouldFallback = true;
  } else if (error.code === 'model_not_found' || error.status === 404) {
    aiError = new AIConfigError('AI model');
    shouldFallback = true;
  } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    aiError = new AIProviderError('openai', error);
    shouldFallback = true;
  } else if (error.code === 'content_filter') {
    aiError = new AIContentFilterError(error.message);
  } else if (error.name === 'TimeoutError') {
    aiError = new AITimeoutError('openai', 30000);
    shouldFallback = true;
  } else {
    aiError = new AIProviderError('openai', error);
    shouldFallback = true;
  }

  const gracefulMessage = (aiError as any).getGracefulMessage 
    ? (aiError as any).getGracefulMessage(shouldFallback)
    : aiError.message;

  return { error: aiError, shouldFallback, gracefulMessage };
}

export function isRetryableError(error: any): boolean {
  if (error instanceof AIError) {
    return error.retryable;
  }
  
  const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'insufficient_quota'];
  const retryableStatuses = [429, 500, 502, 503, 504];
  
  return retryableCodes.includes(error.code) || retryableStatuses.includes(error.status);
}
