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
 * Critical environment variables required for production
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
    description: 'Secret key for session encryption (64+ characters recommended)',
    validator: (value) => value.length >= 32,
  },
];

/**
 * Important environment variables for full functionality
 */
const IMPORTANT_ENV_VARS: EnvVarConfig[] = [
  {
    name: 'PADDLE_WEBHOOK_SECRET',
    required: false,
    description: 'Paddle webhook signature verification secret (critical for payment security)',
  },
  {
    name: 'PADDLE_API_KEY',
    required: false,
    description: 'Paddle API key for payment processing',
  },
  {
    name: 'GOOGLE_CLIENT_ID',
    required: false,
    description: 'Google OAuth client ID for Sign in with Google',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: false,
    description: 'Google OAuth client secret',
  },
  {
    name: 'APPLE_TEAM_ID',
    required: false,
    description: 'Apple Developer Team ID for Sign in with Apple',
  },
  {
    name: 'APPLE_KEY_ID',
    required: false,
    description: 'Apple Sign in Key ID',
  },
  {
    name: 'APPLE_PRIVATE_KEY',
    required: false,
    description: 'Apple private key (PEM format)',
  },
];

/**
 * Optional environment variables for enhanced features
 */
const OPTIONAL_ENV_VARS: EnvVarConfig[] = [
  {
    name: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key for AI mentor features',
  },
  {
    name: 'SENTRY_DSN',
    required: false,
    description: 'Sentry DSN for error tracking',
  },
  {
    name: 'POSTHOG_API_KEY',
    required: false,
    description: 'PostHog API key for analytics',
  },
  {
    name: 'SMTP_HOST',
    required: false,
    description: 'SMTP server hostname for email',
  },
  {
    name: 'SMTP_PORT',
    required: false,
    description: 'SMTP server port',
  },
  {
    name: 'SMTP_USER',
    required: false,
    description: 'SMTP username',
  },
  {
    name: 'SMTP_PASS',
    required: false,
    description: 'SMTP password',
  },
];

/**
 * Validate a single environment variable
 */
function validateEnvVar(config: EnvVarConfig): { valid: boolean; message?: string } {
  const value = process.env[config.name];

  if (!value) {
    return {
      valid: false,
      message: `${config.name} is not set - ${config.description}`,
    };
  }

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

  // Validate critical variables (will block startup if missing)
  for (const config of CRITICAL_ENV_VARS) {
    const result = validateEnvVar(config);
    if (!result.valid) {
      errors.push(`❌ CRITICAL: ${result.message}`);
    }
  }

  // Validate important variables (will warn but not block)
  for (const config of IMPORTANT_ENV_VARS) {
    const result = validateEnvVar(config);
    if (!result.valid) {
      warnings.push(`⚠️  IMPORTANT: ${result.message}`);
    }
  }

  // Validate optional variables (informational only)
  for (const config of OPTIONAL_ENV_VARS) {
    const result = validateEnvVar(config);
    if (!result.valid) {
      // Don't add to warnings, just log during startup
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log validation results
 */
export function logValidationResults(result: ValidationResult): void {
  console.log('\n=== Environment Variable Validation ===\n');

  if (result.errors.length > 0) {
    console.error('Critical errors found:');
    result.errors.forEach((error) => console.error(error));
    console.error('\n⛔ Application cannot start - fix critical errors above\n');
  }

  if (result.warnings.length > 0) {
    console.warn('\nWarnings:');
    result.warnings.forEach((warning) => console.warn(warning));
    console.warn('\n⚠️  Some features may not work - see warnings above\n');
  }

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log('✅ All critical environment variables are configured correctly\n');
  }
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
