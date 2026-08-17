import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

// Apple's JWKS endpoint
const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';

// JWKS client to fetch Apple's public keys
const client = jwksClient({
  jwksUri: APPLE_JWKS_URI,
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
});

// Get Apple's signing key
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return callback(err);
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Verify Apple ID token
export async function verifyAppleToken(identityToken: string): Promise<any> {
  // Accept both iOS Bundle ID and Web Services ID as valid audiences
  const audiencesList: string[] = [
    'org.lilove.app',      // iOS Bundle ID
    'org.lilove.signin',   // Web Services ID
  ];
  
  // Add environment variables if set
  if (process.env.APPLE_CLIENT_ID && !audiencesList.includes(process.env.APPLE_CLIENT_ID)) {
    audiencesList.push(process.env.APPLE_CLIENT_ID);
  }
  if (process.env.APPLE_SERVICE_ID && !audiencesList.includes(process.env.APPLE_SERVICE_ID)) {
    audiencesList.push(process.env.APPLE_SERVICE_ID);
  }
  
  return new Promise((resolve, reject) => {
    // Type assertion needed for jwt.verify audience option
    const options: jwt.VerifyOptions = {
      issuer: 'https://appleid.apple.com',
      algorithms: ['RS256'],
    };
    
    // Set audience with proper type
    (options as any).audience = audiencesList;
    
    jwt.verify(
      identityToken,
      getKey,
      options,
      (err: jwt.VerifyErrors | null, decoded: any) => {
        if (err) {
          reject(new Error('Invalid Apple ID token'));
        } else {
          resolve(decoded);
        }
      }
    );
  });
}
