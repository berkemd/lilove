import { OAuth2Client } from 'google-auth-library';

// Mock Google ID token payloads
export const VALID_GOOGLE_PAYLOAD = {
  sub: '1234567890',
  email: 'test-google@example.com',
  email_verified: true,
  name: 'Google Test User',
  given_name: 'Google',
  family_name: 'User',
  picture: 'https://example.com/picture.jpg',
  aud: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id.apps.googleusercontent.com',
  iss: 'https://accounts.google.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};

export const EXISTING_GOOGLE_PAYLOAD = {
  sub: '9876543210',
  email: 'existing-user@example.com',
  email_verified: true,
  name: 'Existing User',
  given_name: 'Existing',
  family_name: 'User',
  picture: 'https://example.com/existing.jpg',
  aud: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id.apps.googleusercontent.com',
  iss: 'https://accounts.google.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600
};

// Invalid payloads for testing error scenarios
export const EXPIRED_GOOGLE_PAYLOAD = {
  ...VALID_GOOGLE_PAYLOAD,
  exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
};

export const INVALID_AUDIENCE_PAYLOAD = {
  ...VALID_GOOGLE_PAYLOAD,
  aud: 'wrong-client-id.apps.googleusercontent.com'
};

export const INVALID_ISSUER_PAYLOAD = {
  ...VALID_GOOGLE_PAYLOAD,
  iss: 'https://fake-issuer.com'
};

export const MISSING_SUB_PAYLOAD = {
  ...VALID_GOOGLE_PAYLOAD,
  sub: undefined
};

// Mock ID tokens (these will be intercepted by our mocks)
export const VALID_GOOGLE_ID_TOKEN = 'valid-google-id-token';
export const INVALID_GOOGLE_ID_TOKEN = 'invalid-google-id-token';
export const EXPIRED_GOOGLE_ID_TOKEN = 'expired-google-id-token';
export const MALFORMED_GOOGLE_ID_TOKEN = 'not-a-valid-jwt';

// Mock Google OAuth2Client responses
export function mockGoogleVerifyIdToken(idToken: string) {
  if (idToken === VALID_GOOGLE_ID_TOKEN) {
    return Promise.resolve({
      getPayload: () => VALID_GOOGLE_PAYLOAD
    });
  } else if (idToken === INVALID_GOOGLE_ID_TOKEN) {
    throw new Error('Invalid token signature');
  } else if (idToken === EXPIRED_GOOGLE_ID_TOKEN) {
    throw new Error('Token expired');
  } else if (idToken === MALFORMED_GOOGLE_ID_TOKEN) {
    throw new Error('Malformed token');
  }
  throw new Error('Unknown token');
}

// Test user data
export const TEST_GOOGLE_USER = {
  id: '1234567890',
  email: 'test-google@example.com',
  name: 'Google Test User',
  picture: 'https://example.com/picture.jpg'
};

export const EXISTING_GOOGLE_USER = {
  id: '9876543210',
  email: 'existing-user@example.com',
  name: 'Existing User',
  picture: 'https://example.com/existing.jpg'
};
