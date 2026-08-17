import { InsertUser, users } from '@shared/schema';
import bcrypt from 'bcrypt';
import { db } from '../../server/storage';
import { eq, or } from 'drizzle-orm';

// Helper to create hashed password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Seed user for testing account linking scenarios
export const EXISTING_EMAIL_USER: Omit<InsertUser, 'password'> & { password?: string } = {
  email: 'existing-user@example.com',
  displayName: 'Existing User',
  firstName: 'Existing',
  lastName: 'User',
  coinBalance: 1000,
  subscriptionTier: 'free',
  subscriptionStatus: 'active'
};

// Test user data for Apple Sign-In
export const APPLE_TEST_USER = {
  appleId: '001234.567890abcdef.1234',
  email: 'test-apple@example.com',
  displayName: 'Apple User',
  firstName: 'Apple',
  lastName: 'User'
};

// Test user data for Google Sign-In
export const GOOGLE_TEST_USER = {
  googleId: '1234567890',
  email: 'test-google@example.com',
  displayName: 'Google Test User',
  firstName: 'Google',
  lastName: 'User'
};

// Helper function to create seed user in database
export async function createSeedUser(userData: Partial<InsertUser> & { email: string }): Promise<any> {
  const user = await db.insert(users).values({
    email: userData.email,
    displayName: userData.displayName || 'Test User',
    firstName: userData.firstName,
    lastName: userData.lastName,
    appleId: userData.appleId,
    googleId: userData.googleId,
    password: userData.password,
    coinBalance: userData.coinBalance || 1000,
    subscriptionTier: userData.subscriptionTier || 'free',
    subscriptionStatus: userData.subscriptionStatus || 'active'
  }).returning();
  
  return user[0];
}

// Helper function to clean up test users
export async function cleanupTestUsers(emails: string[]): Promise<void> {
  if (emails.length === 0) return;
  
  const conditions = emails.map(email => eq(users.email, email));
  await db.delete(users).where(or(...conditions));
}
