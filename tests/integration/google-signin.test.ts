import request from 'supertest';
import { createTestServer } from '../helpers/testServer';
import { db } from '../../server/storage';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import {
  VALID_GOOGLE_ID_TOKEN,
  INVALID_GOOGLE_ID_TOKEN,
  EXPIRED_GOOGLE_ID_TOKEN,
  MALFORMED_GOOGLE_ID_TOKEN,
  VALID_GOOGLE_PAYLOAD,
  EXISTING_GOOGLE_PAYLOAD,
  INVALID_AUDIENCE_PAYLOAD,
  TEST_GOOGLE_USER,
  EXISTING_GOOGLE_USER
} from '../fixtures/googleJWT';
import { createSeedUser, EXISTING_EMAIL_USER } from '../fixtures/testUsers';
import * as googleJWT from '../../server/auth/googleJWT';

describe('Google Sign-In Integration Tests (POST /api/auth/google/mobile)', () => {
  let app: any;

  beforeAll(async () => {
    // Create test server using production routes
    app = await createTestServer();

    // Mock Google JWT verification
    jest.spyOn(googleJWT, 'verifyGoogleToken').mockImplementation(async (idToken: string) => {
      if (idToken === VALID_GOOGLE_ID_TOKEN) {
        return VALID_GOOGLE_PAYLOAD;
      } else if (idToken === 'existing-user-token') {
        return EXISTING_GOOGLE_PAYLOAD;
      } else if (idToken === INVALID_GOOGLE_ID_TOKEN) {
        throw new Error('Invalid token signature');
      } else if (idToken === EXPIRED_GOOGLE_ID_TOKEN) {
        throw new Error('Token expired');
      } else if (idToken === 'invalid-audience-token') {
        throw new Error('Audience validation failed');
      } else if (idToken === MALFORMED_GOOGLE_ID_TOKEN) {
        throw new Error('Malformed token');
      } else if (idToken === 'empty-client-ids-token') {
        throw new Error('Google Sign-In not configured - no client IDs set in environment variables');
      }
      throw new Error('Google token verification failed');
    });
  });

  afterAll(async () => {
    jest.restoreAllMocks();
  });

  afterEach(async () => {
    // Clean up test users
    await db.delete(users).where(eq(users.email, TEST_GOOGLE_USER.email));
    await db.delete(users).where(eq(users.email, EXISTING_GOOGLE_USER.email));
    await db.delete(users).where(eq(users.email, EXISTING_EMAIL_USER.email));
  });

  describe('Happy Path: First-time user creation', () => {
    it('should create a new user with Google ID on first sign-in', async () => {
      const response = await request(app)
        .post('/api/auth/google/mobile')
        .send({
          idToken: VALID_GOOGLE_ID_TOKEN
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(VALID_GOOGLE_PAYLOAD.email);
      expect(response.body.user.googleId).toBe(VALID_GOOGLE_PAYLOAD.sub);
      expect(response.body.user.displayName).toBe(VALID_GOOGLE_PAYLOAD.name);

      // Verify user was created in database
      const dbUser = await db.select().from(users).where(eq(users.email, VALID_GOOGLE_PAYLOAD.email));
      expect(dbUser.length).toBe(1);
      expect(dbUser[0].googleId).toBe(VALID_GOOGLE_PAYLOAD.sub);
      expect(dbUser[0].firstName).toBe(VALID_GOOGLE_PAYLOAD.given_name);
      expect(dbUser[0].lastName).toBe(VALID_GOOGLE_PAYLOAD.family_name);
      expect(dbUser[0].coinBalance).toBe(1000); // Welcome bonus
    });
  });

  describe('Happy Path: Existing user login', () => {
    it('should log in existing Google user', async () => {
      // Create existing user first
      const existingUser = await createSeedUser({
        email: EXISTING_GOOGLE_PAYLOAD.email,
        googleId: EXISTING_GOOGLE_PAYLOAD.sub,
        displayName: EXISTING_GOOGLE_PAYLOAD.name
      });

      const response = await request(app)
        .post('/api/auth/google/mobile')
        .send({
          idToken: 'existing-user-token'
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.id).toBe(existingUser.id);
      expect(response.body.user.email).toBe(EXISTING_GOOGLE_PAYLOAD.email);
      expect(response.body.user.googleId).toBe(EXISTING_GOOGLE_PAYLOAD.sub);
    });

    it('should update lastLoginAt timestamp for returning users', async () => {
      // Create existing user
      await createSeedUser({
        email: EXISTING_GOOGLE_PAYLOAD.email,
        googleId: EXISTING_GOOGLE_PAYLOAD.sub,
        displayName: EXISTING_GOOGLE_PAYLOAD.name
      });

      await request(app)
        .post('/api/auth/google/mobile')
        .send({
          idToken: 'existing-user-token'
        })
        .expect(200);

      // Verify lastLoginAt was updated
      const dbUser = await db.select().from(users).where(eq(users.email, EXISTING_GOOGLE_PAYLOAD.email));
      expect(dbUser[0].lastLoginAt).toBeTruthy();
    });
  });

  describe('Happy Path: Email account linking', () => {
    it('should link Google ID to existing email account', async () => {
      // Create existing email user (no Google ID yet)
      const existingUser = await createSeedUser({
        email: VALID_GOOGLE_PAYLOAD.email, // Same email as Google token
        displayName: 'Existing User',
        password: await require('bcrypt').hash('password123', 10)
      });

      const response = await request(app)
        .post('/api/auth/google/mobile')
        .send({
          idToken: VALID_GOOGLE_ID_TOKEN
        })
        .expect(200);

      expect(response.body.user.id).toBe(existingUser.id);
      expect(response.body.user.email).toBe(VALID_GOOGLE_PAYLOAD.email);
      // Note: Production code doesn't refetch user after linking, so googleId won't be in response
      // but it will be in the database

      // Verify Google ID was linked in database
      const dbUser = await db.select().from(users).where(eq(users.email, VALID_GOOGLE_PAYLOAD.email));
      expect(dbUser[0].googleId).toBe(VALID_GOOGLE_PAYLOAD.sub);
    });
  });

  describe('Failure: Invalid JWT token', () => {
    it('should reject invalid ID token', async () => {
      const response = await request(app)
        .post('/api/auth/google/mobile')
        .send({
          idToken: INVALID_GOOGLE_ID_TOKEN
        })
        .expect(401);

      expect(response.body.message).toContain('Google token verification failed');
    });

    it('should reject malformed token', async () => {
      const response = await request(app)
        .post('/api/auth/google/mobile')
        .send({
          idToken: MALFORMED_GOOGLE_ID_TOKEN
        })
        .expect(401);

      expect(response.body.message).toContain('verification failed');
    });

    it('should reject missing ID token', async () => {
      const response = await request(app)
        .post('/api/auth/google/mobile')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Missing Google ID token');
    });
  });

  describe('Failure: Empty client IDs (security guard)', () => {
    it('should reject when no Google client IDs are configured', async () => {
      const response = await request(app)
        .post('/api/auth/google/mobile')
        .send({
          idToken: 'empty-client-ids-token'
        })
        .expect(401);

      expect(response.body.message).toContain('Google token verification failed');
      expect(response.body.details).toContain('no client IDs');
    });
  });

  describe('Failure: Audience validation fails', () => {
    it('should reject token with invalid audience', async () => {
      const response = await request(app)
        .post('/api/auth/google/mobile')
        .send({
          idToken: 'invalid-audience-token'
        })
        .expect(401);

      expect(response.body.message).toContain('verification failed');
    });
  });

  describe('Failure: Token expired', () => {
    it('should reject expired Google token', async () => {
      const response = await request(app)
        .post('/api/auth/google/mobile')
        .send({
          idToken: EXPIRED_GOOGLE_ID_TOKEN
        })
        .expect(401);

      expect(response.body.message).toContain('verification failed');
    });
  });
});
