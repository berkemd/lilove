# Payment System and OAuth Integration Setup Guide

This guide explains how to configure and test the payment systems and OAuth integrations in LiLove.

## Table of Contents
1. [OAuth Setup](#oauth-setup)
2. [Payment Integration Setup](#payment-integration-setup)
3. [Testing](#testing)
4. [Troubleshooting](#troubleshooting)

## OAuth Setup

### Google OAuth

1. **Create Google OAuth Credentials:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `https://lilove.org/api/auth/google/callback`
     - `http://localhost:5000/api/auth/google/callback` (for development)

2. **Set Environment Variables:**
   ```bash
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

3. **Test:**
   - Navigate to `/auth` page
   - Click "Continue with Google"
   - Should redirect to Google OAuth consent screen

### Apple Sign-In

1. **Apple Developer Setup:**
   - Go to [Apple Developer Portal](https://developer.apple.com/)
   - Create an App ID with "Sign in with Apple" capability
   - Create a Service ID for web authentication
   - Create a Key for Apple Sign-In
   - Configure the following:
     - **Bundle ID**: `org.lilove.app` (or your custom ID)
     - **Service ID**: `org.lilove.signin`
     - **Return URLs**: `https://lilove.org/api/auth/apple/callback`
     - **Domains**: `lilove.org`

2. **Download Private Key:**
   - Download the `.p8` key file from Apple Developer
   - Convert to PEM format if needed
   - Add newlines as `\n` in environment variable

3. **Set Environment Variables:**
   ```bash
   APPLE_CLIENT_ID=org.lilove.signin
   APPLE_TEAM_ID=YOUR_TEAM_ID
   APPLE_KEY_ID=YOUR_KEY_ID
   APPLE_PRIVATE_KEY_PEM="-----BEGIN PRIVATE KEY-----
   YOUR_PRIVATE_KEY_CONTENT_HERE
   -----END PRIVATE KEY-----"
   ```

4. **Test:**
   - Navigate to `/auth` page
   - Click "Continue with Apple"
   - Should redirect to Apple ID authentication

## Payment Integration Setup

### Paddle Setup

1. **Create Paddle Account:**
   - Sign up at [Paddle.com](https://paddle.com/)
   - Complete vendor verification
   - Get API credentials from Settings → Developer Tools

2. **Create Products:**
   - Create subscription products for each plan (Pro, Team, etc.)
   - Create one-time products for coin packages
   - Note the Price IDs for each product

3. **Configure Webhook:**
   - Go to Developer Tools → Webhooks
   - Add webhook URL: `https://lilove.org/api/paddle/webhook`
   - Copy webhook secret

4. **Set Environment Variables:**
   ```bash
   PADDLE_API_KEY=your-api-key
   PADDLE_WEBHOOK_SECRET=your-webhook-secret
   ```

5. **Update Database:**
   - Add Paddle Price IDs to your subscription plans and coin packages in database:
   ```sql
   UPDATE subscription_plans 
   SET paddle_monthly_price_id = 'pri_xxx', 
       paddle_yearly_price_id = 'pri_yyy'
   WHERE name = 'pro';
   ```

### Apple In-App Purchases (IAP)

1. **App Store Connect Setup:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com/)
   - Create in-app purchase products
   - Product IDs should follow pattern: `org.lilove.app.subscription.pro.monthly`

2. **Generate API Key:**
   - Go to Users and Access → Keys
   - Create new key with App Manager role
   - Download `.p8` key file

3. **Set Environment Variables:**
   ```bash
   APPSTORE_KEY_ID=YOUR_KEY_ID
   APPSTORE_ISSUER_ID=YOUR_ISSUER_ID
   APPLE_BUNDLE_ID=org.lilove.app
   appstore_private_key="-----BEGIN PRIVATE KEY-----
   YOUR_KEY_CONTENT
   -----END PRIVATE KEY-----"
   ```

4. **Configure Server-to-Server Notifications:**
   - In App Store Connect, configure notification URL:
     - `https://lilove.org/api/payments/apple/webhook`

### Stripe (Legacy/Backup)

1. **Create Stripe Account:**
   - Sign up at [Stripe.com](https://stripe.com/)
   - Get API keys from Dashboard → Developers → API keys

2. **Set Environment Variables:**
   ```bash
   STRIPE_SECRET_KEY=sk_live_xxx
   STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   ```

### iyzipay (Turkish Market)

1. **Create iyzipay Account:**
   - Sign up at [iyzico.com](https://www.iyzico.com/)
   - Complete merchant verification
   - Get API credentials

2. **Set Environment Variables:**
   ```bash
   IYZIPAY_API_KEY=your-api-key
   IYZIPAY_SECRET_KEY=your-secret-key
   ```

## Testing

### Test OAuth Flows

1. **Google OAuth:**
   ```bash
   # Start the server
   npm run dev
   
   # Navigate to http://localhost:5000/auth
   # Click "Continue with Google"
   # Verify successful authentication
   ```

2. **Apple Sign-In:**
   ```bash
   # Navigate to http://localhost:5000/auth
   # Click "Continue with Apple"
   # Verify successful authentication
   ```

### Test Payment Flows

1. **Paddle Subscription:**
   ```bash
   # Navigate to /pricing
   # Select a plan
   # Complete Paddle checkout (use test card in sandbox mode)
   # Verify webhook receives events
   # Check database for subscription status update
   ```

2. **Apple IAP:**
   ```bash
   # In iOS app, initiate purchase
   # Verify receipt submission to server
   # Check logs for verification success
   # Verify subscription status in database
   ```

### Webhook Testing

Use tools like [webhook.site](https://webhook.site) or ngrok for local testing:

```bash
# Install ngrok
npm install -g ngrok

# Create tunnel
ngrok http 5000

# Use the HTTPS URL as your webhook URL in Paddle/Apple/etc.
```

## Troubleshooting

### Google OAuth Issues

**Problem:** "redirect_uri_mismatch" error
- **Solution:** Ensure the redirect URI in Google Console exactly matches `https://lilove.org/api/auth/google/callback`

**Problem:** User info not being retrieved
- **Solution:** Verify Google+ API is enabled and scopes include email and profile

### Apple Sign-In Issues

**Problem:** "invalid_client" error
- **Solution:** Verify Service ID matches APPLE_CLIENT_ID and is properly configured with domain and return URLs

**Problem:** Private key error
- **Solution:** Ensure the private key is properly formatted with `\n` for newlines and includes BEGIN/END markers

### Paddle Issues

**Problem:** Webhook signature verification fails
- **Solution:** Ensure PADDLE_WEBHOOK_SECRET matches the secret in Paddle dashboard

**Problem:** Checkout not opening
- **Solution:** Verify Price IDs in database match actual Paddle product Price IDs

### Apple IAP Issues

**Problem:** Receipt verification fails
- **Solution:** Ensure you're using correct environment (Sandbox vs Production)

**Problem:** Transaction not found
- **Solution:** Verify transaction ID format and App Store Connect configuration

## Security Notes

1. **Never commit secrets to git**
   - Use `.env` files (added to `.gitignore`)
   - Use environment variables in production

2. **Webhook Signatures**
   - Always verify webhook signatures
   - Reject unsigned or invalid requests

3. **HTTPS Required**
   - All OAuth and payment callbacks require HTTPS in production
   - Apple Sign-In strictly requires HTTPS

4. **Private Key Storage**
   - Store private keys securely
   - Rotate keys periodically
   - Use secret management services in production (AWS Secrets Manager, etc.)

## Support

For issues or questions:
- Email: support@lilove.org
- Check server logs for detailed error messages
- Enable debug mode: `NODE_ENV=development`
