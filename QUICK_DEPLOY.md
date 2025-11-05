# Quick Deployment Reference Card

## 🚨 CRITICAL FIX: Production API Routes Returning JSON (Not HTML)

### What Was Fixed
- API routes now return JSON instead of HTML
- OAuth login flows work correctly
- iOS app can connect to backend
- Health checks work properly

### Quick Deploy Commands

#### Firebase Hosting (Recommended)
```bash
# One-time setup
npm install -g firebase-tools
firebase login

# Deploy
npm run build
firebase deploy --only hosting

# Test
curl -I https://lilove.org/api/health
# Should return: Content-Type: application/json
```

#### Replit (Easiest)
```bash
# Just push your code and click Deploy in Replit UI
# Or use Replit CLI
replit deploy
```

#### App Engine
```bash
# Setup
gcloud init
gcloud config set project YOUR_PROJECT_ID

# Deploy
npm run build
gcloud app deploy app.yaml

# Test
curl -I https://lilove.org/api/health
```

### Quick Test Script
```bash
# Test production deployment
./scripts/test-routing.sh https://lilove.org

# Expected output:
# ✓ /healthz returns JSON
# ✓ /api/health returns JSON
# ✓ /api/pricing returns JSON
# ✓ / returns HTML (SPA)
```

### Environment Variables Required
Make sure these are set in your deployment platform:
```
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=<generate-random-secret>
PORT=5000 (or as configured)
```

### Troubleshooting

**Still getting HTML for API routes?**
1. Clear CDN cache (Cloudflare, CloudFront)
2. Wait 5 minutes for DNS propagation
3. Check deployment logs for errors
4. Verify NODE_ENV=production

**OAuth not working?**
1. Check CORS settings include your domain
2. Verify OAuth redirect URLs in provider console
3. Check environment variables for OAuth credentials

**iOS app can't connect?**
1. Verify HTTPS is working
2. Check API returns JSON (not HTML)
3. Test with curl first before testing app

### Quick Verification Checklist
- [ ] Build completes: `npm run build`
- [ ] Deploy completes without errors
- [ ] `/healthz` returns JSON
- [ ] `/api/health` returns JSON
- [ ] OAuth redirect works
- [ ] Test script passes
- [ ] iOS app connects successfully

### Rollback (If Needed)
```bash
# Firebase
firebase hosting:rollback

# Git
git revert HEAD
git push

# Replit
Use Replit UI to rollback
```

### Support Contacts
- Check `PRODUCTION_ROUTING_FIX.md` for detailed guide
- Check `ROUTING_FIX_SUMMARY.md` for complete analysis
- Review deployment logs in your platform console

---

**Status**: ✅ Ready to Deploy
**Last Updated**: 2025-11-05
**Tested**: Build ✓ | Code Review ✓ | Security ✓
