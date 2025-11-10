#!/usr/bin/env tsx
/**
 * OAuth Setup Script
 * Configures Google and Apple Sign-In for the application
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const OAUTH_CONFIG = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.NODE_ENV === 'production' 
      ? 'https://lilove.org/api/auth/google/callback'
      : 'http://localhost:5000/api/auth/google/callback',
    scopes: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  },
  apple: {
    clientId: process.env.APPLE_CLIENT_ID || 'org.lilove.signin',
    teamId: process.env.APPLE_TEAM_ID || '',
    keyId: process.env.APPLE_KEY_ID || '',
    privateKey: process.env.APPLESIGNIN_SECRET_KEY || '',
    redirectUri: process.env.NODE_ENV === 'production'
      ? 'https://lilove.org/api/auth/apple/callback'
      : 'http://localhost:5000/api/auth/apple/callback',
  }
};

function generateMockCredentials() {
  console.log('🔐 Generating mock OAuth credentials for development...\n');
  
  // Generate mock Google credentials
  const mockGoogleId = `${Math.random().toString(36).substring(2)}-mock.apps.googleusercontent.com`;
  const mockGoogleSecret = `GOCSPX-${Math.random().toString(36).substring(2)}`;
  
  // Generate mock Apple credentials
  const mockAppleTeamId = 'MOCK' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const mockAppleKeyId = Math.random().toString(36).substring(2, 12).toUpperCase();
  
  // Generate mock Apple private key
  const mockApplePrivateKey = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgevZzL1gdAFr88hb2
OF/2NxApJCzGCEDdfSp6VQO30hyhRANCAAQRWz+jn65BtOMvdyHKcvjBeBSDZH2r
1RTwjmYSi9R/zpBnuQ4EiMnCqfMPWiZqB4QdbAd0E7oH50VpuZ1P087G
-----END PRIVATE KEY-----`;

  const envContent = `# Auto-generated OAuth Configuration for Development
# WARNING: These are mock credentials for development only!

# Google OAuth (Mock for Development)
GOOGLE_CLIENT_ID=${mockGoogleId}
GOOGLE_CLIENT_SECRET=${mockGoogleSecret}
GOOGLE_WEB_CLIENT_ID=${mockGoogleId}

# Apple Sign-In (Mock for Development)
APPLE_CLIENT_ID=org.lilove.signin
APPLE_SERVICE_ID=org.lilove.signin
APPLE_TEAM_ID=${mockAppleTeamId}
APPLE_KEY_ID=${mockAppleKeyId}
APPLESIGNIN_SECRET_KEY="${mockApplePrivateKey}"
APPLE_PRIVATE_KEY_PEM="${mockApplePrivateKey}"

# Additional OAuth Settings
OAUTH_MOCK_MODE=true
`;

  // Update .env file
  const envPath = path.join(process.cwd(), '.env');
  const existingEnv = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  
  // Remove old OAuth settings
  const cleanedEnv = existingEnv
    .split('\n')
    .filter(line => !line.startsWith('GOOGLE_') && 
                   !line.startsWith('APPLE_') && 
                   !line.startsWith('APPLESIGNIN_') &&
                   !line.startsWith('OAUTH_'))
    .join('\n');
  
  // Append new OAuth settings
  fs.writeFileSync(envPath, cleanedEnv + '\n' + envContent);
  
  console.log('✅ Mock OAuth credentials generated successfully!');
  console.log('📝 Updated .env file with development credentials\n');
  
  return {
    google: {
      clientId: mockGoogleId,
      clientSecret: mockGoogleSecret
    },
    apple: {
      teamId: mockAppleTeamId,
      keyId: mockAppleKeyId
    }
  };
}

function validateOAuthConfig() {
  console.log('🔍 Validating OAuth Configuration...\n');
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check Google OAuth
  if (!OAUTH_CONFIG.google.clientId || OAUTH_CONFIG.google.clientId.includes('your-')) {
    warnings.push('Google Client ID not configured');
  }
  if (!OAUTH_CONFIG.google.clientSecret || OAUTH_CONFIG.google.clientSecret.includes('your-')) {
    warnings.push('Google Client Secret not configured');
  }
  
  // Check Apple Sign-In
  if (!OAUTH_CONFIG.apple.teamId || OAUTH_CONFIG.apple.teamId.includes('YOUR_')) {
    warnings.push('Apple Team ID not configured');
  }
  if (!OAUTH_CONFIG.apple.keyId || OAUTH_CONFIG.apple.keyId.includes('YOUR_')) {
    warnings.push('Apple Key ID not configured');
  }
  if (!OAUTH_CONFIG.apple.privateKey || OAUTH_CONFIG.apple.privateKey.includes('YOUR_')) {
    warnings.push('Apple Private Key not configured');
  }
  
  // Display results
  if (errors.length > 0) {
    console.log('❌ OAuth Configuration Errors:');
    errors.forEach(error => console.log(`   - ${error}`));
    console.log('');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  OAuth Configuration Warnings:');
    warnings.forEach(warning => console.log(`   - ${warning}`));
    console.log('');
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ OAuth configuration is valid!\n');
    return true;
  }
  
  return errors.length === 0;
}

async function setupOAuth() {
  console.log('🚀 OAuth Setup for LiLove\n');
  console.log('================================================================================\n');
  
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  if (isDevelopment) {
    console.log('🔧 Running in DEVELOPMENT mode\n');
    
    // Validate existing config
    const isValid = validateOAuthConfig();
    
    if (!isValid || process.argv.includes('--force-mock')) {
      console.log('Generating mock credentials for development...\n');
      const mockCreds = generateMockCredentials();
      
      console.log('📋 Mock Credentials Generated:');
      console.log('--------------------------------');
      console.log(`Google Client ID: ${mockCreds.google.clientId}`);
      console.log(`Apple Team ID: ${mockCreds.apple.teamId}`);
      console.log(`Apple Key ID: ${mockCreds.apple.keyId}`);
      console.log('--------------------------------\n');
    }
  } else {
    console.log('🌐 Running in PRODUCTION mode\n');
    
    // Validate configuration
    const isValid = validateOAuthConfig();
    
    if (!isValid) {
      console.log('⚠️  Production OAuth configuration is incomplete!');
      console.log('   Please configure the following in your .env file:\n');
      console.log('   For Google OAuth:');
      console.log('   - GOOGLE_CLIENT_ID');
      console.log('   - GOOGLE_CLIENT_SECRET\n');
      console.log('   For Apple Sign-In:');
      console.log('   - APPLE_TEAM_ID');
      console.log('   - APPLE_KEY_ID');
      console.log('   - APPLESIGNIN_SECRET_KEY\n');
      console.log('   Visit the following URLs to set up OAuth:');
      console.log('   - Google: https://console.cloud.google.com/apis/credentials');
      console.log('   - Apple: https://developer.apple.com/account/resources/identifiers/list\n');
    }
  }
  
  // Create OAuth routes file
  console.log('📝 Creating OAuth routes configuration...\n');
  
  const oauthRoutesContent = `/**
 * OAuth Routes Configuration
 * Auto-generated by setup-oauth.ts
 */

export const OAUTH_ROUTES = {
  google: {
    login: '/api/auth/google',
    callback: '/api/auth/google/callback',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  apple: {
    login: '/api/auth/apple',
    callback: '/api/auth/apple/callback',
    clientId: process.env.APPLE_CLIENT_ID || 'org.lilove.signin',
  },
  logout: '/api/auth/logout',
  session: '/api/auth/session',
};

export const OAUTH_MOCK_MODE = process.env.OAUTH_MOCK_MODE === 'true';
`;

  fs.writeFileSync(
    path.join(process.cwd(), 'server', 'auth', 'oauth-config.ts'),
    oauthRoutesContent
  );
  
  console.log('✅ OAuth configuration completed!\n');
  console.log('📋 Next Steps:');
  console.log('   1. Start the development server: npm run dev');
  console.log('   2. Test Google Sign-In at: http://localhost:5000/api/auth/google');
  console.log('   3. Test Apple Sign-In at: http://localhost:5000/api/auth/apple\n');
}

// Run setup
setupOAuth().catch(console.error);