import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Mock Apple private/public key pair for testing
// In tests, we'll mock jwks-rsa to return this public key
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

export const MOCK_APPLE_PRIVATE_KEY = privateKey;
export const MOCK_APPLE_PUBLIC_KEY = publicKey;

// Mock Apple JWKS response
export const MOCK_APPLE_JWKS = {
  keys: [
    {
      kty: 'RSA',
      kid: 'test-apple-key-id',
      use: 'sig',
      alg: 'RS256',
      n: 'test-modulus',
      e: 'AQAB'
    }
  ]
};

// Generate valid Apple ID token
export function generateValidAppleToken(sub: string, email?: string): string {
  const payload = {
    iss: 'https://appleid.apple.com',
    aud: process.env.APPLE_CLIENT_ID || 'org.lilove.app',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    iat: Math.floor(Date.now() / 1000),
    sub,
    email: email || undefined,
    email_verified: email ? true : undefined,
  };

  return jwt.sign(payload, MOCK_APPLE_PRIVATE_KEY, {
    algorithm: 'RS256',
    keyid: 'test-apple-key-id'
  });
}

// Generate expired Apple ID token
export function generateExpiredAppleToken(sub: string, email?: string): string {
  const payload = {
    iss: 'https://appleid.apple.com',
    aud: process.env.APPLE_CLIENT_ID || 'org.lilove.app',
    exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    iat: Math.floor(Date.now() / 1000) - 7200,
    sub,
    email: email || undefined,
    email_verified: email ? true : undefined,
  };

  return jwt.sign(payload, MOCK_APPLE_PRIVATE_KEY, {
    algorithm: 'RS256',
    keyid: 'test-apple-key-id'
  });
}

// Generate Apple ID token with wrong issuer
export function generateInvalidIssuerAppleToken(sub: string, email?: string): string {
  const payload = {
    iss: 'https://fake-issuer.com',
    aud: process.env.APPLE_CLIENT_ID || 'org.lilove.app',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    sub,
    email: email || undefined,
  };

  return jwt.sign(payload, MOCK_APPLE_PRIVATE_KEY, {
    algorithm: 'RS256',
    keyid: 'test-apple-key-id'
  });
}

// Generate Apple ID token with wrong audience
export function generateInvalidAudienceAppleToken(sub: string, email?: string): string {
  const payload = {
    iss: 'https://appleid.apple.com',
    aud: 'wrong.bundle.id',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    sub,
    email: email || undefined,
  };

  return jwt.sign(payload, MOCK_APPLE_PRIVATE_KEY, {
    algorithm: 'RS256',
    keyid: 'test-apple-key-id'
  });
}

// Completely malformed token
export const MALFORMED_APPLE_TOKEN = 'not-a-valid-jwt-token';

// Test user data
export const TEST_APPLE_USER = {
  user: '001234.567890abcdef.1234',
  email: 'test-apple@example.com',
  fullName: {
    givenName: 'Apple',
    familyName: 'User'
  }
};

export const EXISTING_APPLE_USER = {
  user: '001234.existing-user.1234',
  email: 'existing-user@example.com',
  fullName: {
    givenName: 'Existing',
    familyName: 'User'
  }
};
