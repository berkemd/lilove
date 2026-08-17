import { OAuth2Client } from 'google-auth-library';

// Google OAuth Client IDs for different platforms
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.GOOGLE_IOS_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.GOOGLE_ANDROID_CLIENT_ID || '';
const GOOGLE_WEB_CLIENT_ID = process.env.GOOGLE_WEB_CLIENT_ID || '';

const client = new OAuth2Client();

// Build array of allowed audiences (all platform client IDs)
const ALLOWED_AUDIENCES = [
  GOOGLE_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
].filter(Boolean); // Remove empty strings

// Verify Google ID token
export async function verifyGoogleToken(idToken: string): Promise<any> {
  // SECURITY: Fail fast if no client IDs configured (prevent accepting any token)
  if (ALLOWED_AUDIENCES.length === 0) {
    throw new Error('Google Sign-In not configured - no client IDs set in environment variables');
  }
  
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: ALLOWED_AUDIENCES,
    });
    
    const payload = ticket.getPayload();
    
    if (!payload) {
      throw new Error('Invalid Google ID token payload');
    }
    
    return payload;
  } catch (error: any) {
    throw new Error('Google token verification failed');
  }
}
