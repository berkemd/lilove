# LiLove Operations Runbook

**Version**: 1.0.0  
**Last Updated**: October 28, 2025  
**Audience**: DevOps, SRE, On-Call Engineers

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Health Checks](#health-checks)
4. [Common Issues](#common-issues)
5. [Incident Response](#incident-response)
6. [Deployment](#deployment)
7. [Monitoring](#monitoring)
8. [Database Operations](#database-operations)
9. [Runbook Procedures](#runbook-procedures)

## System Overview

### Service Information

- **Service Name**: LiLove
- **Primary URL**: https://lilove.org
- **API Base**: https://lilove.org/api
- **Status Page**: https://lilove.org/healthz
- **Deployment Platform**: Replit (Web), Apple App Store (iOS)

### Architecture Components

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│   Client    │────▶│   Replit     │────▶│ Neon PostgreSQL│
│  (Browser)  │     │ (Node/Express)│     │   (Database)   │
└─────────────┘     └──────────────┘     └────────────────┘
       │                    │                      │
       │                    ▼                      │
       │            ┌──────────────┐              │
       │            │  External    │              │
       └───────────▶│  Services    │◀─────────────┘
                    │ -OpenAI      │
                    │ -Paddle      │
                    │ -PostHog     │
                    └──────────────┘
```

### Service Dependencies

| Service | Type | Criticality | Fallback |
|---------|------|-------------|----------|
| Neon PostgreSQL | Database | Critical | None |
| OpenAI API | AI Features | High | Graceful degradation |
| Paddle | Payments (Web) | High | Users see error |
| Apple IAP | Payments (iOS) | High | Users see error |
| PostHog | Analytics | Low | Silent failure |

## Health Checks

### Primary Health Endpoints

```bash
# Overall health
curl https://lilove.org/healthz
# Expected: {"status":"healthy"}

# API health
curl https://lilove.org/api/health
# Expected: {"ok":true,"ts":1234567890}

# Database health (requires auth)
curl -X POST https://lilove.org/api/db/health \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"ok":true,"connections":5}
```

### Health Check Schedule

- **Replit**: Automatic health checks every 30 seconds
- **External Monitoring**: Set up UptimeRobot or similar (recommended)
- **Alert Threshold**: 3 consecutive failures = page on-call

### Expected Response Times

| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| `/healthz` | 10ms | 50ms | 100ms |
| `/api/health` | 50ms | 200ms | 500ms |
| `/api/goals` | 100ms | 500ms | 1000ms |
| `/api/ai-mentor/chat` | 2s | 5s | 10s |

## Common Issues

### Issue 1: Database Connection Failures

**Symptoms:**
- 500 errors on all API endpoints
- Logs show: "Cannot connect to database"
- `/api/health` returns error

**Diagnosis:**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
# In logs, look for: "Connection pool exhausted"
```

**Resolution:**
1. Check Neon dashboard for database status
2. Verify `DATABASE_URL` environment variable is correct
3. Check if connection pool is exhausted (max 10 connections)
4. Restart service if connection pool is stuck

**Prevention:**
- Monitor connection pool usage
- Alert if pool usage > 80%
- Implement connection retry logic

### Issue 2: OAuth Login Failures

**Symptoms:**
- Users can't log in with Google/Apple
- Error: "OAuth callback failed"
- Redirects to error page

**Diagnosis:**
```bash
# Check OAuth credentials
npm run check-secrets

# Verify callback URLs in provider console:
# Google: https://console.cloud.google.com/apis/credentials
# Apple: https://developer.apple.com
```

**Resolution:**
1. Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
2. Verify `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` are set
3. Check callback URLs match: `https://lilove.org/api/auth/google/callback`
4. Restart service after updating environment variables

**Prevention:**
- Set up alerts for auth failure rate > 5%
- Monitor OAuth token expiration

### Issue 3: Payment Webhook Failures

**Symptoms:**
- Payments processed but subscriptions not activated
- Logs show: "Webhook signature verification failed"
- Users complain about access

**Diagnosis:**
```bash
# Check recent webhook logs
# In Replit logs, search for: "paddle/webhook"

# Verify webhook secret
echo $PADDLE_WEBHOOK_SECRET
```

**Resolution:**
1. Verify `PADDLE_WEBHOOK_SECRET` matches Paddle dashboard
2. Check webhook URL in Paddle: `https://lilove.org/api/paddle/webhook`
3. Manually sync user subscription:
   ```sql
   UPDATE subscriptions 
   SET status = 'active', expires_at = '2025-12-31' 
   WHERE user_id = 'USER_ID';
   ```

**Prevention:**
- Monitor webhook failure rate
- Set up webhook retry logic
- Alert if webhook failures > 1% of payments

### Issue 4: High Memory Usage

**Symptoms:**
- App slowing down
- Requests timing out
- Replit shows high memory usage

**Diagnosis:**
```bash
# Check memory usage in Replit dashboard
# Look for memory leaks in logs

# If using Node.js, check heap usage:
node --expose-gc server/index.js
```

**Resolution:**
1. Restart the service (memory leak)
2. Check for unbounded arrays/caches in code
3. Verify database connection pool is closing connections
4. Scale up Replit deployment if needed

**Prevention:**
- Monitor memory usage trends
- Alert if memory > 80% for 5 minutes
- Implement automatic restarts on high memory

### Issue 5: API Rate Limiting

**Symptoms:**
- Users getting 429 errors
- Logs show: "Rate limit exceeded"
- Specific user or IP affected

**Diagnosis:**
```bash
# Check rate limit logs
# Search for IP or user ID

# Verify rate limits in code:
# - Auth: 5 req/15min
# - API: 100 req/15min
# - AI: 20 req/hour
```

**Resolution:**
1. Verify it's not malicious (check for patterns)
2. If legitimate user, temporarily whitelist:
   ```
   Add IP to rate limit exception list
   ```
3. If attack, block IP at Replit level

**Prevention:**
- Monitor rate limit hit rate
- Implement CAPTCHA for suspicious activity
- Use distributed rate limiting (Redis) for multi-instance

## Incident Response

### Severity Levels

**SEV1 - Critical** (Page immediately)
- Service completely down
- Data breach or security incident
- Payment processing failures affecting >10% of users

**SEV2 - High** (Page during business hours)
- Degraded performance affecting >50% of users
- One authentication method down
- Database read replica down

**SEV3 - Medium** (Email on-call)
- Minor feature not working
- Slow API responses (p95 > 2s)
- Non-critical service degradation

**SEV4 - Low** (Create ticket)
- UI cosmetic issues
- Analytics not recording
- Non-blocking errors in logs

### Incident Response Steps

1. **Acknowledge**
   - Acknowledge alert within 5 minutes
   - Post in #incidents Slack channel

2. **Assess**
   - Check health endpoints
   - Review logs in Replit
   - Determine severity level

3. **Mitigate**
   - Apply immediate fixes (restart, rollback)
   - Communicate status to users if needed

4. **Resolve**
   - Implement permanent fix
   - Verify service is healthy
   - Monitor for 30 minutes

5. **Postmortem**
   - Write incident report (template below)
   - Identify root cause
   - Create action items to prevent recurrence

### Incident Postmortem Template

```markdown
# Incident Postmortem: [TITLE]

**Date**: YYYY-MM-DD  
**Duration**: X hours Y minutes  
**Severity**: SEVX  
**Incident Commander**: Name

## Summary
Brief description of what happened.

## Impact
- Users affected: X
- Revenue impact: $Y
- Downtime: X minutes

## Timeline
- HH:MM - First alert
- HH:MM - Incident acknowledged
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Service restored

## Root Cause
Technical explanation of what caused the incident.

## Resolution
Steps taken to resolve the incident.

## Action Items
- [ ] Implement monitoring for X
- [ ] Update runbook with Y
- [ ] Add test for Z
```

## Deployment

### Web Deployment (Replit)

**Manual Deployment:**
```bash
# Via Replit UI
1. Go to Replit dashboard
2. Click "Deploy" button
3. Wait for deployment to complete (~5 minutes)
4. Verify health checks pass

# Via CLI
npm install -g @replit/cli
replit auth
replit deploy
```

**Automated Deployment (GitHub Actions):**
- Pushes to `main` branch trigger automatic deployment
- CI runs tests before deploying
- Health checks validate deployment success

**Rollback Procedure:**
```bash
# Via Replit UI
1. Go to Deployment history
2. Select previous successful deployment
3. Click "Deploy this version"
4. Verify health checks

# No CLI rollback - use UI only
```

### iOS Deployment (TestFlight)

**Build & Deploy:**
```bash
cd mobile
eas login
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

**Expected Timeline:**
- Build: 20-30 minutes
- TestFlight processing: 10-30 minutes
- TestFlight review: 24-48 hours

**Rollback:**
- Cannot rollback iOS releases
- Use EAS Update for hot fixes (JavaScript only)
- Submit new build for native changes

## Monitoring

### Key Metrics to Monitor

**Application Metrics:**
- Request rate (requests/second)
- Error rate (errors/total requests)
- Response time (p50, p95, p99)
- Database query time
- Memory and CPU usage

**Business Metrics:**
- New user signups
- Daily/Monthly active users
- Subscription conversions
- Payment success rate
- Goal completion rate

### Alert Configuration

| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Health check failure | 3 consecutive | SEV1 | Page on-call |
| Error rate | > 5% for 5min | SEV2 | Page on-call |
| Response time | p95 > 2s for 10min | SEV2 | Investigate |
| Payment failures | > 1% of transactions | SEV2 | Check Paddle |
| Database connections | > 8/10 for 5min | SEV3 | Investigate |
| Memory usage | > 85% for 10min | SEV3 | Consider restart |

### Monitoring Tools

**Current:**
- Replit built-in monitoring
- PostHog for product analytics
- Database monitoring via Neon dashboard

**Recommended:**
- **Sentry**: Error tracking and alerting
- **UptimeRobot**: External uptime monitoring
- **PagerDuty**: On-call rotation and escalation

## Database Operations

### Backup & Restore

**Automated Backups:**
- Neon performs automatic daily backups
- Retention: 7 days (free tier), 30 days (paid)
- Point-in-time recovery available

**Manual Backup:**
```bash
# Full database dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Schema only
pg_dump $DATABASE_URL --schema-only > schema.sql

# Data only
pg_dump $DATABASE_URL --data-only > data.sql
```

**Restore from Backup:**
```bash
# Restore full database
psql $DATABASE_URL < backup_20251028.sql

# Restore specific table
psql $DATABASE_URL -c "COPY users FROM 'users.csv' CSV HEADER"
```

### Schema Migrations

**Apply Migration:**
```bash
# Push schema changes (development)
npm run db:push

# Generate migration (production)
npx drizzle-kit generate:pg
npx drizzle-kit migrate
```

**Rollback Migration:**
```bash
# Manual rollback
psql $DATABASE_URL < rollback.sql

# Or restore from backup
```

### Database Maintenance

**Check Table Sizes:**
```sql
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(table_name::text)) AS size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(table_name::text) DESC;
```

**Check Slow Queries:**
```sql
-- First, check if pg_stat_statements is available
SELECT * FROM pg_available_extensions WHERE name = 'pg_stat_statements';

-- If available but not enabled, enable it
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Then query slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Vacuum and Analyze:**
```sql
-- Run during low traffic
VACUUM ANALYZE;
```

## Runbook Procedures

### Procedure: Rotate Session Secret

**When:** Every 90 days or after suspected compromise

**Steps:**
1. Generate new secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
2. Add new secret to environment: `NEW_SESSION_SECRET=<new_value>`
3. Update code to try both secrets (grace period)
4. Deploy with dual-secret support
5. After 24 hours, remove old secret
6. Update `SESSION_SECRET` to new value

**Impact:** All users logged out after old secret removed

### Procedure: Scale Database

**When:** Database CPU > 80% consistently or query times increasing

**Steps:**
1. Check Neon dashboard for current usage
2. Upgrade Neon plan if needed
3. Consider read replicas for analytics queries
4. Optimize slow queries first (check pg_stat_statements)
5. Add indexes for frequently queried columns

### Procedure: Emergency User Data Export

**When:** User requests urgent data export (GDPR)

**Steps:**
```bash
# 1. Identify user
psql $DATABASE_URL -c "SELECT id FROM users WHERE email='user@example.com'"

# 2. Export user data
node scripts/export-user-data.js <user_id> > user_data.json

# 3. Verify export contains all data
# 4. Send to user via secure method (encrypted email)
```

## Contacts

### On-Call Rotation

- **Primary**: [Name] - [Phone] - [Email]
- **Secondary**: [Name] - [Phone] - [Email]
- **Escalation**: [Name] - [Phone] - [Email]

### External Support

- **Neon Support**: support@neon.tech
- **Replit Support**: support@replit.com
- **Paddle Support**: support@paddle.com
- **Apple Developer Support**: https://developer.apple.com/support/

---

**Document Owner**: DevOps Team  
**Last Updated**: October 28, 2025  
**Next Review**: January 28, 2026

For runbook updates, submit PR to [berkemd/lilove](https://github.com/berkemd/lilove)
