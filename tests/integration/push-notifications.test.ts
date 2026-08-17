import request from 'supertest';
import { createTestServer } from '../helpers/testServer';
import { db } from '../../server/storage';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { createSeedUser } from '../fixtures/testUsers';
import { generateToken } from '../../server/middleware/auth';

describe('Push Notification Registration Tests (POST /api/user/push-token)', () => {
  let app: any;
  let testUser: any;
  let authToken: string;

  beforeAll(async () => {
    // Create test server using production routes
    app = await createTestServer();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await createSeedUser({
      email: 'push-test-user@example.com',
      displayName: 'Push Test User',
      password: await require('bcrypt').hash('password123', 10)
    });

    // Generate auth token
    authToken = generateToken(testUser.id, testUser.email);
  });

  afterEach(async () => {
    // Clean up test users
    await db.delete(users).where(eq(users.email, 'push-test-user@example.com'));
  });

  describe('Happy Path: Token registration', () => {
    it('should register push notification token for authenticated user', async () => {
      const pushToken = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: pushToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Push token updated');

      // Verify token was saved in database
      const dbUser = await db.select().from(users).where(eq(users.id, testUser.id));
      expect(dbUser[0].pushToken).toBe(pushToken);
    });

    it('should register valid Expo push token format', async () => {
      const expoPushToken = 'ExponentPushToken[AbCdEfGhIjKlMnOpQrStUvWxYz]';

      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: expoPushToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify token format
      const dbUser = await db.select().from(users).where(eq(users.id, testUser.id));
      expect(dbUser[0].pushToken).toMatch(/^ExponentPushToken\[.+\]$/);
    });

    it('should register FCM token format', async () => {
      const fcmToken = 'fcm-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: fcmToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const dbUser = await db.select().from(users).where(eq(users.id, testUser.id));
      expect(dbUser[0].pushToken).toBe(fcmToken);
    });

    it('should register APNS token format', async () => {
      const apnsToken = 'apns-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: apnsToken
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      const dbUser = await db.select().from(users).where(eq(users.id, testUser.id));
      expect(dbUser[0].pushToken).toBe(apnsToken);
    });
  });

  describe('Happy Path: Token update', () => {
    it('should update existing push token', async () => {
      const oldToken = 'ExponentPushToken[old-token-xxxxxxxxxxxx]';
      const newToken = 'ExponentPushToken[new-token-yyyyyyyyyyyy]';

      // Register old token
      await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: oldToken })
        .expect(200);

      // Update to new token
      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: newToken })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify new token replaced old token
      const dbUser = await db.select().from(users).where(eq(users.id, testUser.id));
      expect(dbUser[0].pushToken).toBe(newToken);
      expect(dbUser[0].pushToken).not.toBe(oldToken);
    });

    it('should handle multiple token updates', async () => {
      const tokens = [
        'ExponentPushToken[token1-xxxxxx]',
        'ExponentPushToken[token2-yyyyyy]',
        'ExponentPushToken[token3-zzzzzz]'
      ];

      for (const token of tokens) {
        await request(app)
          .post('/api/user/push-token')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ token })
          .expect(200);
      }

      // Verify final token is stored
      const dbUser = await db.select().from(users).where(eq(users.id, testUser.id));
      expect(dbUser[0].pushToken).toBe(tokens[2]);
    });

    it('should allow re-registering the same token (idempotent)', async () => {
      const token = 'ExponentPushToken[same-token-xxxxxx]';

      // Register token twice
      await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token })
        .expect(200);

      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token })
        .expect(200);

      expect(response.body.success).toBe(true);

      const dbUser = await db.select().from(users).where(eq(users.id, testUser.id));
      expect(dbUser[0].pushToken).toBe(token);
    });
  });

  describe('Failure: Unauthenticated request', () => {
    it('should reject request without auth token', async () => {
      const response = await request(app)
        .post('/api/user/push-token')
        .send({
          token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'
        })
        .expect(401);

      expect(response.body.message).toBeTruthy();
    });

    it('should reject request with invalid auth token', async () => {
      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', 'Bearer invalid-token-xxx')
        .send({
          token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'
        })
        .expect(401);

      expect(response.body.message).toBeTruthy();
    });

    it('should reject request with expired auth token', async () => {
      // Generate expired token (negative expiry)
      const expiredToken = generateToken(testUser.id, testUser.email);
      // Manually create expired JWT for testing
      const jwt = require('jsonwebtoken');
      const expiredJwt = jwt.sign(
        { id: testUser.id, email: testUser.email },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${expiredJwt}`)
        .send({
          token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'
        })
        .expect(401);

      expect(response.body.message).toBeTruthy();
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', 'InvalidHeaderFormat')
        .send({
          token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]'
        })
        .expect(401);

      expect(response.body.message).toBeTruthy();
    });
  });

  describe('Failure: Invalid token format', () => {
    it('should reject empty token', async () => {
      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: ''
        })
        .expect(400);

      expect(response.body.message).toContain('Push token is required');
    });

    it('should reject missing token field', async () => {
      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('Push token is required');
    });

    it('should reject null token', async () => {
      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: null
        })
        .expect(400);

      expect(response.body.message).toContain('Push token is required');
    });

    it('should reject undefined token', async () => {
      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: undefined
        })
        .expect(400);

      expect(response.body.message).toContain('Push token is required');
    });

    // Note: The route currently accepts any non-empty string as a token
    // In production, you might want to add validation for specific token formats
    it('should accept any non-empty string token (current behavior)', async () => {
      const response = await request(app)
        .post('/api/user/push-token')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          token: 'any-string-token'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
