#!/usr/bin/env tsx
/**
 * Secret Validation Script
 * 
 * Checks that all required environment variables are set before deployment.
 * Exits with code 1 if any critical secrets are missing.
 * 
 * Usage:
 *   npm run check-secrets
 *   tsx scripts/check-secrets.ts
 */

interface SecretDefinition {
  name: string;
  required: 'critical' | 'recommended' | 'optional';
  description: string;
  example?: string;
  validationPattern?: RegExp;
}

const REQUIRED_SECRETS: SecretDefinition[] = [
  // Database
  {
    name: 'DATABASE_URL',
    required: 'critical',
    description: 'Neon PostgreSQL connection string',
    example: 'postgresql://user:password@host.neon.tech/database',
    validationPattern: /^postgresql:\/\/.+/
  },
  
  // Session
  {
    name: 'SESSION_SECRET',
    required: 'critical',
    description: 'Express session encryption key (64+ random characters)',
    validationPattern: /.{64,}/
  },
  
  // Apple OAuth (Web)
  {
    name: 'APPLE_CLIENT_ID',
    required: 'critical',
    description: 'Apple Service ID for Sign in with Apple',
    example: 'org.lilove.signin'
  },
  {
    name: 'APPLE_TEAM_ID',
    required: 'critical',
    description: 'Apple Developer Team ID',
    example: '87U9ZK37M2',
    validationPattern: /^[A-Z0-9]{10}$/
  },
  {
    name: 'APPLE_KEY_ID',
    required: 'critical',
    description: 'Apple Sign in Key ID',
    example: 'ABC123DEFG',
    validationPattern: /^[A-Z0-9]{10}$/
  },
  {
    name: 'APPLE_PRIVATE_KEY',
    required: 'critical',
    description: 'Apple private key in PEM format',
    validationPattern: /^-----BEGIN PRIVATE KEY-----/
  },
  
  // Google OAuth
  {
    name: 'GOOGLE_CLIENT_ID',
    required: 'critical',
    description: 'Google OAuth 2.0 client ID',
    example: '123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com',
    validationPattern: /\.apps\.googleusercontent\.com$/
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    required: 'critical',
    description: 'Google OAuth 2.0 client secret'
  },
  
  // Email (Magic Link)
  {
    name: 'SMTP_HOST',
    required: 'recommended',
    description: 'SMTP server hostname for sending emails',
    example: 'smtp.gmail.com'
  },
  {
    name: 'SMTP_PORT',
    required: 'recommended',
    description: 'SMTP server port',
    example: '587',
    validationPattern: /^[0-9]{2,5}$/
  },
  {
    name: 'SMTP_USER',
    required: 'recommended',
    description: 'SMTP username/email'
  },
  {
    name: 'SMTP_PASS',
    required: 'recommended',
    description: 'SMTP password or app-specific password'
  },
  {
    name: 'MAIL_FROM',
    required: 'recommended',
    description: 'Sender email address',
    example: 'noreply@lilove.org',
    validationPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  
  // Paddle (Web Payments)
  {
    name: 'PADDLE_ENV',
    required: 'critical',
    description: 'Paddle environment (sandbox or production)',
    example: 'sandbox',
    validationPattern: /^(sandbox|production)$/
  },
  {
    name: 'PADDLE_VENDOR_ID',
    required: 'critical',
    description: 'Paddle vendor/seller ID',
    validationPattern: /^[0-9]+$/
  },
  {
    name: 'PADDLE_API_KEY',
    required: 'critical',
    description: 'Paddle API key or auth token'
  },
  {
    name: 'PADDLE_WEBHOOK_SECRET',
    required: 'critical',
    description: 'Paddle webhook secret for signature verification'
  },
  
  // Apple App Store
  {
    name: 'ASC_ISSUER_ID',
    required: 'critical',
    description: 'App Store Connect API issuer ID',
    example: '12345678-1234-1234-1234-123456789012',
    validationPattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  },
  {
    name: 'ASC_KEY_ID',
    required: 'critical',
    description: 'App Store Connect API key ID',
    example: 'ABC123DEFG',
    validationPattern: /^[A-Z0-9]{10}$/
  },
  {
    name: 'ASC_PRIVATE_KEY',
    required: 'critical',
    description: 'App Store Connect API private key (base64 or PEM)',
    validationPattern: /.{100,}/
  },
  
  // iOS App Configuration
  {
    name: 'IOS_BUNDLE_ID',
    required: 'critical',
    description: 'iOS app bundle identifier',
    example: 'org.lilove.app',
    validationPattern: /^[a-z0-9.]+$/
  },
  {
    name: 'IOS_APPLE_ID',
    required: 'recommended',
    description: 'Apple ID email for app management',
    validationPattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  {
    name: 'APP_STORE_APP_ID',
    required: 'recommended',
    description: 'App Store app ID',
    example: '6753267087',
    validationPattern: /^[0-9]{10}$/
  },
  
  // AI/Analytics (Optional but recommended)
  {
    name: 'OPENAI_API_KEY',
    required: 'optional',
    description: 'OpenAI API key for AI coach features',
    validationPattern: /^sk-/
  },
  {
    name: 'POSTHOG_API_KEY',
    required: 'optional',
    description: 'PostHog API key for analytics'
  },
  {
    name: 'SENTRY_DSN',
    required: 'optional',
    description: 'Sentry DSN for error tracking',
    validationPattern: /^https:\/\/.+@.+\.ingest\.sentry\.io\//
  },
  
  // Infrastructure (Auto-configured by Replit)
  {
    name: 'REPLIT_DOMAINS',
    required: 'optional',
    description: 'Replit deployment domains (auto-configured)',
    example: 'lilove.org'
  },
  {
    name: 'PORT',
    required: 'optional',
    description: 'Server port (default: 5000)',
    example: '5000',
    validationPattern: /^[0-9]{4,5}$/
  }
];

interface ValidationResult {
  name: string;
  status: 'present' | 'missing' | 'invalid';
  value?: string;
  error?: string;
  required: 'critical' | 'recommended' | 'optional';
}

function validateSecret(secret: SecretDefinition): ValidationResult {
  const value = process.env[secret.name];
  
  if (!value) {
    return {
      name: secret.name,
      status: 'missing',
      required: secret.required
    };
  }
  
  // Validate pattern if provided
  if (secret.validationPattern && !secret.validationPattern.test(value)) {
    return {
      name: secret.name,
      status: 'invalid',
      value: maskSecret(value),
      error: `Does not match expected pattern`,
      required: secret.required
    };
  }
  
  return {
    name: secret.name,
    status: 'present',
    value: maskSecret(value),
    required: secret.required
  };
}

function maskSecret(value: string): string {
  if (value.length <= 10) {
    return '*'.repeat(value.length);
  }
  return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
}

function printResults(results: ValidationResult[]): void {
  console.log('\n🔐 Secret Validation Report\n');
  console.log('='.repeat(80));
  
  const critical = results.filter(r => r.required === 'critical');
  const recommended = results.filter(r => r.required === 'recommended');
  const optional = results.filter(r => r.required === 'optional');
  
  // Critical secrets
  console.log('\n🚨 CRITICAL SECRETS (deployment will fail if missing):');
  printSecretGroup(critical);
  
  // Recommended secrets
  console.log('\n⚠️  RECOMMENDED SECRETS (features may be limited):');
  printSecretGroup(recommended);
  
  // Optional secrets
  console.log('\n💡 OPTIONAL SECRETS (enhanced features):');
  printSecretGroup(optional);
  
  console.log('\n' + '='.repeat(80));
  
  // Summary
  const criticalMissing = critical.filter(r => r.status !== 'present');
  const criticalInvalid = critical.filter(r => r.status === 'invalid');
  const recommendedMissing = recommended.filter(r => r.status !== 'present');
  
  console.log('\n📊 SUMMARY:');
  console.log(`   Critical: ${critical.length - criticalMissing.length}/${critical.length} configured`);
  console.log(`   Recommended: ${recommended.length - recommendedMissing.length}/${recommended.length} configured`);
  console.log(`   Optional: ${optional.filter(r => r.status === 'present').length}/${optional.length} configured`);
  
  if (criticalMissing.length > 0 || criticalInvalid.length > 0) {
    console.log('\n❌ VALIDATION FAILED');
    console.log(`   ${criticalMissing.length} critical secrets missing`);
    console.log(`   ${criticalInvalid.length} critical secrets invalid`);
    console.log('\n🔧 ACTION REQUIRED:');
    console.log('   1. Add missing secrets to .env file or Replit Secrets');
    console.log('   2. Run this script again to verify');
    console.log('   3. Refer to TECH_PLAN.md for secret descriptions');
    process.exit(1);
  }
  
  if (recommendedMissing.length > 0) {
    console.log('\n⚠️  WARNING: Some recommended secrets are missing');
    console.log('   Features like Magic Link auth and email notifications may not work');
  }
  
  console.log('\n✅ VALIDATION PASSED - All critical secrets are configured\n');
}

function printSecretGroup(results: ValidationResult[]): void {
  results.forEach(result => {
    const icon = result.status === 'present' ? '✅' : result.status === 'invalid' ? '❌' : '❌';
    const statusText = result.status === 'present' ? 'OK' : result.status === 'invalid' ? 'INVALID' : 'MISSING';
    
    console.log(`   ${icon} ${result.name.padEnd(30)} [${statusText}]`);
    
    if (result.status === 'present' && result.value) {
      console.log(`      Value: ${result.value}`);
    }
    
    if (result.status === 'invalid' && result.error) {
      console.log(`      Error: ${result.error}`);
    }
    
    if (result.status === 'missing') {
      const secret = REQUIRED_SECRETS.find(s => s.name === result.name);
      if (secret?.description) {
        console.log(`      Info: ${secret.description}`);
      }
      if (secret?.example) {
        console.log(`      Example: ${secret.example}`);
      }
    }
  });
}

function generateEnvTemplate(): void {
  console.log('\n# Environment Variables Template for LiLove');
  console.log('# Copy this to .env and fill in the values\n');
  
  const groups = [
    { title: 'Database', secrets: REQUIRED_SECRETS.filter(s => s.name.includes('DATABASE')) },
    { title: 'Session', secrets: REQUIRED_SECRETS.filter(s => s.name.includes('SESSION')) },
    { title: 'Apple OAuth', secrets: REQUIRED_SECRETS.filter(s => s.name.startsWith('APPLE_') && !s.name.includes('STORE')) },
    { title: 'Google OAuth', secrets: REQUIRED_SECRETS.filter(s => s.name.startsWith('GOOGLE_')) },
    { title: 'Email/SMTP', secrets: REQUIRED_SECRETS.filter(s => s.name.startsWith('SMTP_') || s.name === 'MAIL_FROM') },
    { title: 'Paddle Payments', secrets: REQUIRED_SECRETS.filter(s => s.name.startsWith('PADDLE_')) },
    { title: 'Apple App Store', secrets: REQUIRED_SECRETS.filter(s => s.name.startsWith('ASC_') || s.name.startsWith('IOS_') || s.name.startsWith('APP_STORE')) },
    { title: 'AI & Analytics', secrets: REQUIRED_SECRETS.filter(s => s.name === 'OPENAI_API_KEY' || s.name === 'POSTHOG_API_KEY' || s.name === 'SENTRY_DSN') },
    { title: 'Infrastructure', secrets: REQUIRED_SECRETS.filter(s => s.name === 'REPLIT_DOMAINS' || s.name === 'PORT') }
  ];
  
  groups.forEach(group => {
    if (group.secrets.length > 0) {
      console.log(`\n# ${group.title}`);
      group.secrets.forEach(secret => {
        console.log(`# ${secret.description}`);
        if (secret.example) {
          console.log(`# Example: ${secret.example}`);
        }
        console.log(`${secret.name}=`);
      });
    }
  });
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--template') || args.includes('-t')) {
    generateEnvTemplate();
    return;
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Secret Validation Script for LiLove

Usage:
  tsx scripts/check-secrets.ts [options]

Options:
  --help, -h       Show this help message
  --template, -t   Generate .env template
  --ci             CI mode (exit code only, minimal output)

Examples:
  tsx scripts/check-secrets.ts              # Validate all secrets
  tsx scripts/check-secrets.ts --template   # Generate .env template
  tsx scripts/check-secrets.ts --ci         # CI validation
`);
    return;
  }
  
  const results = REQUIRED_SECRETS.map(validateSecret);
  
  if (args.includes('--ci')) {
    // CI mode: minimal output
    const criticalFailed = results.filter(r => r.required === 'critical' && r.status !== 'present');
    if (criticalFailed.length > 0) {
      console.error(`❌ ${criticalFailed.length} critical secrets missing or invalid`);
      criticalFailed.forEach(r => console.error(`   - ${r.name}`));
      process.exit(1);
    }
    console.log('✅ All critical secrets validated');
    return;
  }
  
  printResults(results);
}

main().catch(error => {
  console.error('Error running secret validation:', error);
  process.exit(1);
});
