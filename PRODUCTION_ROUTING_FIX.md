# Production Routing Fix - Deployment Guide

## Problem Summary
Production deployment (Firebase/GCP) was returning HTML instead of JSON for API endpoints because:
1. The static file server's catch-all route was capturing API requests
2. Missing proper routing configuration in deployment platform

## Fixes Applied

### 1. Server Code Fix (`server/vite.ts`)
Modified the `serveStatic` function to exclude API routes from the SPA catch-all:

```typescript
// Before: All unmatched routes returned SPA HTML
app.use("*", (_req, res) => {
  res.sendFile(path.resolve(distPath, "index.html"));
});

// After: Only serve SPA for non-API routes
app.use("*", (req, res, next) => {
  if (req.originalUrl.startsWith('/api/') || req.originalUrl === '/healthz') {
    return next();
  }
  res.sendFile(path.resolve(distPath, "index.html"));
});
```

### 2. Firebase Hosting Configuration (`firebase.json`)
Created proper routing rules for Firebase Hosting:
- `/api/**` → Routes to Express backend service
- `/healthz` → Routes to Express backend service
- All other routes → Serve SPA with proper fallback to index.html

### 3. Alternative Configurations
Created deployment configs for various platforms:
- `firebase.json` - Firebase Hosting
- `app.yaml` - Google Cloud App Engine
- `.firebaserc` - Firebase project settings

## Deployment Instructions

### Option 1: Firebase Hosting (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Update `.firebaserc`** with your project ID:
   ```json
   {
     "projects": {
       "default": "your-firebase-project-id"
     }
   }
   ```

4. **Update `firebase.json`** serviceId if needed:
   - Replace `lilove-backend` with your Cloud Run service name
   - Verify the region matches your deployment

5. **Build the application**:
   ```bash
   npm run build
   ```

6. **Deploy to Firebase**:
   ```bash
   firebase deploy --only hosting
   ```

### Option 2: Google Cloud App Engine

1. **Install Google Cloud SDK**:
   ```bash
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   ```

2. **Initialize gcloud**:
   ```bash
   gcloud init
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **Deploy**:
   ```bash
   gcloud app deploy app.yaml
   ```

### Option 3: Replit Deployment (Easiest)

1. **In Replit Console**:
   - Click "Publish" or "Deploy"
   - Select "Autoscale" deployment
   - Copy the provided `.replit.app` URL

2. **Configure Custom Domain**:
   - In Replit: Deployments → Custom Domains → Add Domain
   - Add `lilove.org` and follow DNS instructions

3. **Update DNS** (at your domain registrar):
   ```
   Type: CNAME
   Name: @ or www
   Value: [your-replit-deployment].replit.app
   TTL: 3600
   ```

### Option 4: Nginx Reverse Proxy

If you're using your own server with Nginx:

1. **Create Nginx config** (`/etc/nginx/sites-available/lilove.org`):
   ```nginx
   server {
       listen 80;
       listen 443 ssl http2;
       server_name lilove.org;

       # SSL configuration
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;

       # API routes to backend
       location /api/ {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }

       location /healthz {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
       }

       # Static files
       location / {
           root /var/www/lilove/dist/public;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

2. **Enable and restart**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/lilove.org /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

## Testing After Deployment

Run these tests to verify the fix:

```bash
# 1. Health check (should return JSON)
curl https://lilove.org/healthz
# Expected: {"status":"healthy"}

# 2. API health (should return JSON)
curl https://lilove.org/api/health
# Expected: {"ok":true,"ts":...}

# 3. Pricing endpoint (should return JSON)
curl https://lilove.org/api/pricing
# Expected: JSON pricing data (or auth error in JSON)

# 4. Any API endpoint should return JSON, not HTML
curl -I https://lilove.org/api/auth/me
# Expected: Content-Type: application/json (not text/html)

# 5. Non-API routes should serve SPA
curl -I https://lilove.org/
# Expected: Content-Type: text/html (with React app)
```

## Verification Checklist

After deployment, verify:

- [ ] `/healthz` returns JSON: `{"status":"healthy"}`
- [ ] `/api/health` returns JSON: `{"ok":true}`
- [ ] `/api/pricing` returns JSON (not HTML)
- [ ] `/api/auth/google` redirects properly
- [ ] `/api/auth/apple` redirects properly
- [ ] All `/api/*` endpoints return JSON (not HTML)
- [ ] OAuth callbacks work correctly
- [ ] Paddle webhooks are received
- [ ] iOS app can connect to backend APIs
- [ ] Main website (SPA) loads correctly

## Important Notes

1. **DNS Propagation**: DNS changes can take 24-48 hours to fully propagate
2. **Cache Clearing**: Clear CDN cache if using Cloudflare, CloudFront, etc.
3. **SSL Certificates**: Ensure SSL is properly configured for custom domain
4. **Environment Variables**: Verify all required environment variables are set in production
5. **CORS Settings**: The backend is configured to allow requests from `lilove.org`

## Troubleshooting

### Issue: Still getting HTML for API routes

**Solution**: Check the order of middleware in `server/index.ts`:
1. Routes should be registered BEFORE static file serving
2. Verify `registerRoutes(app)` is called before `serveStatic(app)`

### Issue: CORS errors

**Solution**: Update CORS settings in `server/index.ts` to include your production domain

### Issue: 404 on API routes

**Solution**: 
- Check deployment logs for errors
- Verify the backend service is running
- Confirm routing rules are properly configured

### Issue: Firebase deployment fails

**Solution**:
```bash
# Check Firebase CLI version
firebase --version

# Update if needed
npm install -g firebase-tools@latest

# Re-authenticate
firebase logout
firebase login
```

## Monitoring

After deployment, monitor:
- Application logs in Firebase/GCP console
- Error rates in Sentry (if configured)
- API response times
- Failed authentication attempts

## Rollback Plan

If issues occur after deployment:

1. **Firebase**:
   ```bash
   firebase hosting:rollback
   ```

2. **App Engine**:
   ```bash
   gcloud app versions list
   gcloud app services set-traffic default --splits [previous-version]=1
   ```

3. **Replit**: Use the Replit console to roll back to a previous deployment

## Support

For additional help:
- Check deployment logs in your platform's console
- Review the PRODUCTION_DEPLOYMENT_ISSUE.md file
- Contact the development team if issues persist
