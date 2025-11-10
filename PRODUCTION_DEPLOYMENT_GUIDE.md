# 🚀 LiLove Production Deployment Guide

Complete guide to deploy LiLove to production on lilove.org

---

## 📋 Pre-Deployment Checklist

### 1. Required Credentials
- [ ] PostgreSQL database URL
- [ ] Google OAuth credentials
- [ ] Apple Sign-In credentials
- [ ] OpenAI or Anthropic API key
- [ ] Stripe or Paddle payment credentials
- [ ] Domain DNS configured (lilove.org)
- [ ] SSL certificate (auto with most hosts)

### 2. Service Accounts
- [ ] Google Cloud Console project
- [ ] Apple Developer account
- [ ] Stripe/Paddle account
- [ ] PostHog account (analytics)
- [ ] Sentry account (error tracking)

---

## 🏗️ Deployment Options

### Option A: Deploy to Replit (Recommended for Quick Start)

**Advantages**: Zero configuration, automatic SSL, built-in database

1. **Fork this Repl** or import from GitHub

2. **Configure Secrets** (in Replit Secrets tab):
   ```
   DATABASE_URL=<provided-by-replit>
   SESSION_SECRET=<generate-secure-string>
   GOOGLE_CLIENT_ID=<your-value>
   GOOGLE_CLIENT_SECRET=<your-value>
   OPENAI_API_KEY=<your-value>
   STRIPE_SECRET_KEY=<your-value>
   ```

3. **Link Custom Domain**:
   - Go to Replit Dashboard → Your Repl → Settings → Custom Domain
   - Add `lilove.org` and `www.lilove.org`
   - Update DNS CNAME records as instructed

4. **Run Production Build**:
   ```bash
   npm run build
   npm start
   ```

5. **Enable Always On** (for 24/7 uptime)

---

### Option B: Deploy to Vercel

**Advantages**: Best for Next.js/React, global CDN, automatic scaling

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Configure vercel.json**:
   ```json
   {
     "version": 2,
     "builds": [
       { "src": "dist/index.js", "use": "@vercel/node" },
       { "src": "dist/public/**", "use": "@vercel/static" }
     ],
     "routes": [
       { "src": "/api/(.*)", "dest": "/dist/index.js" },
       { "src": "/(.*)", "dest": "/dist/public/$1" }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

3. **Build and Deploy**:
   ```bash
   npm run build
   vercel --prod
   ```

4. **Configure Environment Variables** in Vercel Dashboard

5. **Link Domain**: Add `lilove.org` in Vercel domains

---

### Option C: Deploy to Railway

**Advantages**: Built-in PostgreSQL, Redis, automatic deployments

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Initialize Project**:
   ```bash
   railway init
   ```

3. **Add PostgreSQL**:
   ```bash
   railway add postgresql
   ```

4. **Deploy**:
   ```bash
   railway up
   ```

5. **Configure Domain** in Railway dashboard

---

### Option D: Deploy to AWS/DigitalOcean/Custom VPS

**Advantages**: Full control, scalability, custom configuration

#### Setup Steps:

1. **Provision Server** (Ubuntu 20.04+ recommended)

2. **Install Dependencies**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 20+
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PostgreSQL
   sudo apt install -y postgresql postgresql-contrib
   
   # Install Nginx
   sudo apt install -y nginx
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

3. **Configure PostgreSQL**:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE lilove_prod;
   CREATE USER lilove_user WITH ENCRYPTED PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE lilove_prod TO lilove_user;
   \q
   ```

4. **Clone and Setup Application**:
   ```bash
   cd /var/www
   git clone <your-repo-url> lilove
   cd lilove
   npm ci --production
   npm run build
   ```

5. **Configure Environment**:
   ```bash
   cp .env.production .env
   # Edit .env with your credentials
   nano .env
   ```

6. **Setup PM2**:
   ```bash
   pm2 start dist/index.js --name lilove
   pm2 save
   pm2 startup
   ```

7. **Configure Nginx**:
   ```nginx
   # /etc/nginx/sites-available/lilove.org
   server {
       listen 80;
       server_name lilove.org www.lilove.org;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

8. **Enable Nginx Config**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/lilove.org /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

9. **Setup SSL with Let's Encrypt**:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d lilove.org -d www.lilove.org
   ```

10. **Configure Firewall**:
    ```bash
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    sudo ufw enable
    ```

---

## 🗄️ Database Migration

### Run Migrations:
```bash
cd /home/user/webapp
npm run db:migrate
```

### Seed Initial Data:
```bash
npm run db:seed
```

### Backup Database:
```bash
# PostgreSQL
pg_dump -U username -d database_name > backup.sql

# Restore
psql -U username -d database_name < backup.sql
```

---

## 🔐 Security Configuration

### 1. Generate Secure Secrets:
```bash
# Generate SESSION_SECRET (64 characters)
openssl rand -base64 48

# Generate JWT_SECRET
openssl rand -base64 32
```

### 2. Configure CORS:
Update `server/index.ts` with your production domains:
```typescript
const allowedOrigins = [
  'https://lilove.org',
  'https://www.lilove.org'
];
```

### 3. Enable HTTPS Only:
```typescript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### 4. Setup Rate Limiting:
Already configured in `server/index.ts`

### 5. Enable Security Headers:
Helmet is already configured

---

## 📊 Monitoring & Analytics

### 1. Setup Sentry (Error Tracking):
```bash
# Add to .env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### 2. Setup PostHog (Analytics):
```bash
# Add to .env
POSTHOG_API_KEY=phc_your_api_key
POSTHOG_HOST=https://app.posthog.com
```

### 3. Setup Health Checks:
Access health endpoint:
```
https://lilove.org/api/health
```

### 4. Monitor Logs:
```bash
# PM2 logs
pm2 logs lilove

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Application logs
tail -f logs/app.log
```

---

## 🧪 Testing Production Build

### 1. Local Production Test:
```bash
# Build
npm run build

# Start production server locally
cd dist
NODE_ENV=production node index.js

# Test endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/
```

### 2. Load Testing:
```bash
# Install Apache Bench
sudo apt install apache2-utils

# Test
ab -n 1000 -c 10 https://lilove.org/
```

### 3. Security Scan:
```bash
# Install OWASP ZAP or use online tools
# Run security audit
npm audit
```

---

## 🔄 Continuous Deployment

### GitHub Actions (Recommended):

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/lilove
            git pull
            npm ci --production
            npm run build
            pm2 restart lilove
```

---

## 🆘 Troubleshooting

### Issue: Server won't start
```bash
# Check logs
pm2 logs lilove --lines 100

# Check port availability
sudo lsof -i :5000

# Verify environment variables
node -e "console.log(process.env)"
```

### Issue: Database connection fails
```bash
# Test PostgreSQL connection
psql -U username -d database_name -h host -p port

# Check DATABASE_URL format
echo $DATABASE_URL
```

### Issue: OAuth not working
- Verify redirect URIs in Google/Apple console
- Check CORS configuration
- Ensure HTTPS is enabled

### Issue: High memory usage
```bash
# Monitor with PM2
pm2 monit

# Increase memory limit
pm2 start dist/index.js --name lilove --max-memory-restart 1G
```

---

## 📞 Support

- **Documentation**: Check `/docs` folder
- **Issues**: Report on GitHub
- **Emergency**: Check logs and health endpoint first

---

## ✅ Post-Deployment Checklist

- [ ] Application accessible at https://lilove.org
- [ ] SSL certificate valid and auto-renewing
- [ ] Database connected and migrated
- [ ] OAuth flows working (Google, Apple)
- [ ] Payment processing functional
- [ ] AI coaching responding
- [ ] Analytics tracking
- [ ] Error monitoring active
- [ ] Backups configured
- [ ] Monitoring alerts setup
- [ ] Load tested
- [ ] Security scanned
- [ ] Documentation updated
- [ ] Team notified

---

**Deployment Date**: _________________  
**Deployed By**: _________________  
**Version**: 1.0.0  
**Next Review**: _________________
