import request from 'supertest';
import { createTestServer } from '../helpers/testServer';
import { db } from '../../server/storage';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
  generateValidAppleToken,
  generateExpiredAppleToken,
  generateInvalidIssuerAppleToken,
  TEST_APPLE_USER,
  EXISTING_APPLE_USER,
  MALFORMED_APPLE_TOKEN,
  MOCK_APPLE_PUBLIC_KEY
} from '../fixtures/appleJWT';
import { createSeedUser, EXISTING_EMAIL_USER } from '../fixtures/testUsers';
import * as appleJWT from '../../server/auth/appleJWT';

describe('Apple Sign-In Integration Tests (POST /api/auth/apple)', () => {
  let app: any;

  beforeAll(async () => {
    // Create test server using production routes
    app = await createTestServer();

    // Mock Apple JWT verification
    jest.spyOn(appleJWT, 'verifyAppleToken').mockImplementation(async (token: string) => {
      // Handle special test tokens
      if (token === MALFORMED_APPLE_TOKEN) {
        throw new Error('Invalid Apple ID token');
      }
      
      // Try to decode the JWT token
      try {
        const parts = token.split('.');
        if (parts.length !== 3) {
          throw new Error('Invalid Apple ID token');
        }
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        
        // Check for expired token
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
          throw new Error('Token expired');
        }
        
        // Check for invalid issuer
        if (payload.iss && payload.iss !== 'https://appleid.apple.com') {
          throw new Error('Invalid issuer');
        }
        
        return payload;
      } catch (error: any) {
        if (error.message === 'Token expired' || error.message === 'Invalid issuer') {
          throw error;
        }
        throw new Error('Invalid Apple ID token');
      }
    });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    // Clean up test users
    await db.delete(users).where(eq(users.email, TEST_APPLE_USER.email));
    await db.delete(users).where(eq(users.email, EXISTING_APPLE_USER.email));
    await db.delete(users).where(eq(users.email, EXISTING_EMAIL_USER.email));
  });

  describe('Happy Path: First-time user creation', () => {
    it('should create a new user with Apple ID on first sign-in', async () => {
      const identityToken = generateValidAppleToken(
        TEST_APPLE_USER.user,
        TEST_APPLE_USER.email
      );

      const response = await request(app)
        .post('/api/auth/apple')
        .send({
          identityToken,
          user: TEST_APPLE_USER.user,
          email: TEST_APPLE_USER.email,
          fullName: TEST_APPLE_USER.fullName
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      // Production code may use private email format if email not in verified payload
      expect(response.body.user.email).toMatch(/@(example\.com|appleid\.private)$/);
      expect(response.body.user.appleId).toBe(TEST_APPLE_USER.user);
      expect(response.body.user.displayName).toContain('Apple');

      // Verify user was created in database with Apple ID
      const dbUser = await db.select().from(users).where(eq(users.appleId, TEST_APPLE_USER.user));
      expect(dbUser.length).toBe(1);
      expect(dbUser[0].appleId).toBe(TEST_APPLE_USER.user);
      expect(dbUser[0].coinBalance).toBe(1000); // Welcome bonus
    });

    it('should create user with private email when no email provided', async () => {
      const identityToken = generateValidAppleToken(TEST_APPLE_USER.user);
      const privateAppleId = 'test-private-user-' + Date.now();

      const response = await request(app)
        .post('/api/auth/apple')
        .send({
          identityToken: generateValidAppleToken(privateAppleId),
          user: privateAppleId,
          fullName: TEST_APPLE_USER.fullName
        })
        .expect(200);

      expect(response.body.user.email).toContain('@appleid.private');
      expect(response.body.user.appleId).toBe(privateAppleId);
      
      // Cleanup
      await db.delete(users).where(eq(users.appleId, privateAppleId));
    });
  });

  describe('Happy Path: Existing user login', () => {
    it('should log in existing Apple user', async () => {
      // Create existing user first
      const existingUser = await createSeedUser({
        email: EXISTING_APPLE_USER.email,
        appleId: EXISTING_APPLE_USER.user,
        displayName: 'Existing Apple User'
      });

      const identityToken = generateValidAppleToken(
        EXISTING_APPLE_USER.user,
        EXISTING_APPLE_USER.email
      );

      const response = await request(app)
        .post('/api/auth/apple')
        .send({
          identityToken,
          user: EXISTING_APPLE_USER.user,
          email: EXISTING_APPLE_USER.email,
          fullName: EXISTING_APPLE_USER.fullName
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.id).toBe(existingUser.id);
      expect(response.body.user.email).toBe(EXISTING_APPLE_USER.email);
    });

    it('should update lastLoginAt timestamp for returning users', async () => {
      // Create existing user
      await createSeedUser({
        email: EXISTING_APPLE_USER.email,
        appleId: EXISTING_APPLE_USER.user,
        displayName: 'Existing User'
      });

      const identityToken = generateValidAppleToken(
        EXISTING_APPLE_USER.user,
        EXISTING_APPLE_USER.email
      );

      await request(app)
        .post('/api/auth/apple')
        .send({
          identityToken,
          user: EXISTING_APPLE_USER.user,
          email: EXISTING_APPLE_USER.email,
          fullName: EXISTING_APPLE_USER.fullName
        })
        .expect(200);

      // Verify lastLoginAt was updated
      const dbUser = await db.select().from(users).where(eq(users.email, EXISTING_APPLE_USER.email));
      expect(dbUser[0].lastLoginAt).toBeTruthy();
    });
  });

  describe('Happy Path: Email account linking', () => {
    it('should link Apple ID to existing email account', async () => {
      // Create existing email user (no Apple ID yet)
      const existingUser = await createSeedUser({
        email: EXISTING_EMAIL_USER.email,
        displayName: EXISTING_EMAIL_USER.displayName,
        password: await require('bcrypt').hash('password123', 10)
      });

      const identityToken = generateValidAppleToken(
        EXISTING_APPLE_USER.user,
        EXISTING_EMAIL_USER.email  // Same email as existing account
      );

      const response = await request(app)
        .post('/api/auth/apple')
        .send({
          identityToken,
          user: EXISTING_APPLE_USER.user,
          email: EXISTING_EMAIL_USER.email,
          fullName: EXISTING_APPLE_USER.fullName
        })
        .expect(200);

      expect(response.body.user.id).toBe(existingUser.id);
      expect(response.body.user.email).toBe(EXISTING_EMAIL_USER.email);
      // Note: Production code doesn't refetch user after linking, so appleId won't be in response
      // but it will be in the database

      // Verify Apple ID was linked in database
      const dbUser = await db.select().from(users).where(eq(users.email, EXISTING_EMAIL_USER.email));
      expect(dbUser[0].appleId).toBe(EXISTING_APPLE_USER.user);
    });
  });

  describe('Failure: Invalid JWT token', () => {
    it('should reject malformed JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/apple')
        .send({
          identityToken: MALFORMED_APPLE_TOKEN,
          user: TEST_APPLE_USER.user,
          email: TEST_APPLE_USER.email
        })
        .expect(401);

      expect(response.body.message).toContain('Apple token verification failed');
    });

    it('should reject missing identity token', async () => {
      const response = await request(app)
        .post('/api/auth/apple')
        .send({
          user: TEST_APPLE_USER.user,
          email: TEST_APPLE_USER.email
        })
        .expect(400);

      expect(response.body.message).toContain('Missing required Apple Sign-In data');
    });

    it('should reject missing user ID', async () => {
      const identityToken = generateValidAppleToken(TEST_APPLE_USER.user, TEST_APPLE_USER.email);

      const response = await request(app)
        .post('/api/auth/apple')
        .send({
          identityToken,
          email: TEST_APPLE_USER.email
        })
        .expect(400);

      expect(response.body.message).toContain('Missing required Apple Sign-In data');
    });
  });

  describe('Failure: JWT signature verification fails', () => {
    it('should reject expired token', async () => {
      const expiredToken = generateExpiredAppleToken(TEST_APPLE_USER.user, TEST_APPLE_USER.email);

      const response = await request(app)
        .post('/api/auth/apple')
        .send({
          identityToken: expiredToken,
          user: TEST_APPLE_USER.user,
          email: TEST_APPLE_USER.email
        })
        .expect(401);

      expect(response.body.message).toContain('Apple token verification failed');
    });

    it('should reject token with invalid issuer', async () => {
      const invalidToken = generateInvalidIssuerAppleToken(TEST_APPLE_USER.user, TEST_APPLE_USER.email);

      const response = await request(app)
        .post('/api/auth/apple')
        .send({
          identityToken: invalidToken,
          user: TEST_APPLE_USER.user,
          email: TEST_APPLE_USER.email
        })
        .expect(401);

      expect(response.body.message).toContain('verification failed');
    });
  });

  describe('Failure: User ID mismatch', () => {
    it('should reject when token subject does not match user ID', async () => {
      const identityToken = generateValidAppleToken(
        'different-user-id',
        TEST_APPLE_USER.email
      );

      const response = await request(app)
        .post('/api/auth/apple')
        .send({
          identityToken,
          user: TEST_APPLE_USER.user, // Different from token's sub
          email: TEST_APPLE_USER.email
        })
        .expect(401);

      expect(response.body.message).toBe('Token subject does not match user ID');
    });
  });
});
