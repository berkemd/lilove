/**
 * Environment Variable Validation
 * 
 * Validates critical environment variables at application startup.
 * Provides clear error messages and warnings for missing or invalid configuration.
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface EnvVarConfig {
  name: string;
  required: boolean;
  description: string;
  validator?: (value: string) => boolean;
}

/**
 * MANDATORY environment variables required for production deployment
 * Production will FAIL-FAST (process.exit(1)) if any of these are missing
 */
const CRITICAL_ENV_VARS: EnvVarConfig[] = [
  {
    name: 'DATABASE_URL',
    required: true,
    description: 'PostgreSQL database connection string',
    validator: (value) => value.startsWith('postgresql://') || value.startsWith('postgres://'),
  },
  {
    name: 'SESSION_SECRET',
    required: true,
    description: 'Session encryption key (32+ characters minimum)',
    validator: (value) => value.length >= 32,
  },
  {
    name: 'GOOGLE_CLIENT_ID',
    required: true,
    description: 'Google OAuth client ID for Sign in with Google',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: true,
    description: 'Google OAuth client secret',
  },
  {
    name: 'APPLE_CLIENT_ID',
    required: true,
    description: 'Apple OAuth client ID (Services ID)',
  },
  {
    name: 'APPLE_TEAM_ID',
    required: true,
    description: 'Apple Developer Team ID',
  },
  {
    name: 'APPLE_KEY_ID',
    required: true,
    description: 'Apple Sign in Key ID',
  },
  {
    name: 'APPLE_PRIVATE_KEY',
    required: true,
    description: 'Apple private key (PEM format)',
  },
];

/**
 * OPTIONAL environment variables for enhanced features
 * Application will WARN but continue if these are missing
 */
const OPTIONAL_ENV_VARS: EnvVarConfig[] = [
  {
    name: 'STRIPE_SECRET_KEY',
    required: false,
    description: 'Stripe secret API key for payment processing (freemium mode if not set)',
  },
  {
    name: 'VITE_STRIPE_PUBLIC_KEY',
    required: false,
    description: 'Stripe publishable key for frontend checkout',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: false,
    description: 'Stripe webhook signature verification secret',
  },
  {
    name: 'PADDLE_API_KEY',
    required: false,
    description: 'Paddle API key for payment processing (freemium mode if not set)',
  },
  {
    name: 'PADDLE_CLIENT_TOKEN',
    required: false,
    description: 'Paddle client token (publishable key)',
  },
  {
    name: 'PADDLE_WEBHOOK_SECRET',
    required: false,
    description: 'Paddle webhook signature verification secret',
  },
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for AI coach features',
  },
  {
    name: 'REPLIT_DOMAINS',
    required: false,
    description: 'Replit deployment domain(s) for OAuth callbacks',
  },
  {
    name: 'ISSUER_URL',
    required: false,
    description: 'OAuth issuer URL for Replit authentication (optional)',
  },
  {
    name: 'REPL_ID',
    required: false,
    description: 'Replit workspace ID',
  },
  {
    name: 'POSTHOG_API_KEY',
    required: false,
    description: 'PostHog API key for server-side analytics',
  },
  {
    name: 'VITE_POSTHOG_KEY',
    required: false,
    description: 'PostHog project key for client-side analytics',
  },
  {
    name: 'VITE_POSTHOG_HOST',
    required: false,
    description: 'PostHog host URL for analytics',
  },
  {
    name: 'SMTP_HOST',
    required: false,
    description: 'SMTP server hostname for email notifications',
  },
  {
    name: 'SMTP_PORT',
    required: false,
    description: 'SMTP server port',
  },
  {
    name: 'SMTP_USER',
    required: false,
    description: 'SMTP authentication username',
  },
  {
    name: 'SMTP_PASS',
    required: false,
    description: 'SMTP authentication password',
  },
  {
    name: 'EMAIL_FROM',
    required: false,
    description: 'Sender email address for outgoing emails',
  },
  {
    name: 'VAPID_PUBLIC_KEY',
    required: false,
    description: 'VAPID public_KEY for web push notifications',
  },
  {
    name: 'VAPID_PRIVATE_KEY',
    required: false,
    description: 'VAPID private key for web push notifications',
  },
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking and monitoring',
  },
  {
    name: 'ENABLE_GEMINI_FALLBACK',
    required: false,
    description: 'Enable Google Gemini as AI fallback (true/false)',
  },
  {
    name: 'GEMINI_API_KEY',
    required: false,
    description: 'Google Gemini API key for AI fallback',
  },
];

/**
 * Validate a single environment variable
 */
function validateEnvVar(config: EnvVarConfig): { valid: boolean; message?: string } {
  const value = process.env[config.name];

  // Check if value is missing or empty string
  if (!value || value.trim() === '') {
    return {
      valid: false,
      message: `${config.name} is not set - ${config.description}`,
    };
  }

  // Run custom validator if provided
  if (config.validator && !config.validator(value)) {
    return {
      valid: false,
      message: `${config.name} is invalid - ${config.description}`,
    };
  }

  return { valid: true };
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const optionalMissing: string[] = [];

  // Validate critical variables (will block startup in production)
  for (const config of CRITICAL_ENV_VARS) {
    const result = validateEnvVar(config);
    if (!result.valid) {
      errors.push(`  - ${config.name}: ${config.description}`);
    }
  }

  // Validate optional variables (informational only)
  for (const config of OPTIONAL_ENV_VARS) {
    const result = validateEnvVar(config);
    if (!result.valid) {
      optionalMissing.push(`  - ${config.name}: ${config.description}`);
    }
  }

  // Add optional missing to warnings for logging
  if (optionalMissing.length > 0) {
    warnings.push(...optionalMissing);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log validation results with production vs development context
 */
export function logValidationResults(result: ValidationResult): void {
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('\n========================================');
  console.log('   Environment Variable Validation');
  console.log(`   Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log('========================================\n');

  if (result.errors.length > 0) {
    console.error('❌ CRITICAL: Missing mandatory environment variables for production:\n');
    result.errors.forEach((error) => console.error(error));
    
    if (isProduction) {
      console.error('\n⛔ PRODUCTION DEPLOYMENT BLOCKED');
      console.error('Set these secrets in Replit Secrets or deployment environment.');
      console.error('Application will exit in 3 seconds...\n');
    } else {
      console.error('\n⚠️  WARNING: These secrets are REQUIRED for production deployment');
      console.error('Add them to workspace secrets before deploying.\n');
    }
  }

  if (result.warnings.length > 0) {
    console.warn('📋 Optional environment variables not set:\n');
    result.warnings.forEach((warning) => console.warn(warning));
    console.warn('\n⚠️  Some features may not work without these (non-critical)\n');
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('✅ All environment variables are configured correctly\n');
  } else if (result.errors.length === 0) {
    console.log('✅ All critical environment variables are configured\n');
  }
  
  console.log('========================================\n');
}

/**
 * Validate environment and throw error if critical variables are missing
 */
export function validateEnvironmentOrThrow(): void {
  const result = validateEnvironment();
  logValidationResults(result);

  if (!result.isValid) {
    throw new Error('Critical environment variables are missing - see errors above');
  }
}
