# ⚡ LiLove - Quick Start Guide

**Status**: ✅ Production Ready  
**Live Demo**: https://5000-ih1xxui8k8lqgi7n436va-2e1b9533.sandbox.novita.ai/  
**Deployment Target**: https://lilove.org

---

## 🎯 What is LiLove?

LiLove is an **AI-powered habit formation and performance coaching platform** that helps users:
- 🎯 Set and achieve goals
- 📈 Track habits and progress
- 🤖 Get personalized AI coaching
- 🏆 Earn achievements and XP
- 👥 Connect with friends and teams
- 📊 Analyze performance metrics

---

## 🚀 Quick Deploy (5 Minutes)

### Option 1: Deploy to Replit (Fastest)
1. Fork this Repl
2. Add environment variables in Secrets tab:
   ```
   DATABASE_URL=<auto-provided>
   SESSION_SECRET=<generate-random-string>
   GOOGLE_CLIENT_ID=<your-google-id>
   OPENAI_API_KEY=<your-openai-key>
   ```
3. Click "Run"
4. Link custom domain: `lilove.org`

### Option 2: Deploy with Docker
```bash
# 1. Configure environment
cp .env.production .env
# Edit .env with your credentials

# 2. Start services
docker-compose up -d

# 3. Access at http://localhost:5000
```

### Option 3: Deploy to Vercel/Railway
```bash
# 1. Install CLI
npm i -g vercel

# 2. Build and deploy
npm run build
vercel --prod
```

---

## 💻 Local Development

### Prerequisites
- Node.js 20+
- npm or yarn

### Setup (3 steps)
```bash
# 1. Install dependencies
npm install

# 2. Setup database
npm run db:setup

# 3. Start development server
npm run dev
```

**Access**: http://localhost:5000

---

## 🔑 Configuration Checklist

### Required for Production
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `SESSION_SECRET` - 64+ character random string
- [ ] OAuth credentials (Google/Apple)
- [ ] AI API key (OpenAI/Anthropic/Gemini)
- [ ] Payment provider (Stripe/Paddle)

### Optional but Recommended
- [ ] `POSTHOG_API_KEY` - Analytics
- [ ] `SENTRY_DSN` - Error tracking
- [ ] `REDIS_URL` - Caching
- [ ] `SMTP_*` - Email notifications

---

## 📋 Feature Checklist

✅ **Core Features**
- [x] User authentication (Google, Apple)
- [x] Goal and task management
- [x] AI coaching and chat
- [x] Progress tracking
- [x] Habit formation
- [x] Gamification (XP, achievements, levels)

✅ **Social Features**
- [x] Friends and connections
- [x] Teams and collaboration
- [x] Social feed
- [x] Real-time notifications

✅ **Premium Features**
- [x] Subscription management
- [x] Payment processing
- [x] Advanced analytics
- [x] Priority support

✅ **Technical**
- [x] Real-time updates (Socket.IO)
- [x] Mobile responsive
- [x] PWA support
- [x] iOS app ready

---

## 🧪 Testing

### Quick Test
```bash
# Run all tests
./scripts/run-all-tests.sh

# Or individual tests
npm run check       # Type checking
npm audit          # Security
npm run build      # Production build
```

### Test Accounts (Development)
- Email: `test@example.com`
- Password: Auto-generated (mock auth)

---

## 📊 Project Structure

```
lilove/
├── client/           # React frontend
├── server/           # Express backend
│   ├── auth/        # Authentication
│   ├── payments/    # Payment processing
│   ├── ai/          # AI coaching
│   └── routes.ts    # API endpoints
├── shared/          # Shared types
├── scripts/         # Automation scripts
├── dist/           # Production build
└── docs/           # Documentation
```

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run check           # Type check
npm run db:push         # Update database

# Production
npm run build           # Build for production
npm start              # Start production server
./scripts/build-production.sh  # Full build

# Testing
npm test               # Run tests
npm run check-secrets  # Validate config

# Database
npm run db:migrate     # Run migrations
npm run db:seed        # Seed data
```

---

## 🆘 Troubleshooting

### Server won't start
```bash
# Check environment variables
cat .env

# Check port availability
lsof -i :5000

# View logs
tail -f logs/app.log
```

### Database connection fails
```bash
# Test connection
npm run db:test

# Reset database
rm local.db && npm run db:setup
```

### Build errors
```bash
# Clear and reinstall
rm -rf node_modules dist
npm install
npm run build
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `README.md` | Project overview |
| `PROJECT_COMPLETION_REPORT.md` | Complete feature audit |
| `PRODUCTION_DEPLOYMENT_GUIDE.md` | Deployment instructions |
| `DEPLOYMENT_STATUS.md` | Current status |
| `QUICKSTART.md` | This file |

---

## 🔗 Important Links

### Development
- **Dev Server**: http://localhost:5000
- **API Docs**: http://localhost:5000/api/docs
- **Health Check**: http://localhost:5000/api/health

### Production
- **Website**: https://lilove.org
- **Admin**: https://lilove.org/admin
- **API**: https://lilove.org/api

### External Services
- **Google Console**: https://console.cloud.google.com
- **Apple Developer**: https://developer.apple.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **PostHog**: https://app.posthog.com

---

## ✨ Quick Tips

1. **Use Mock Services**: For development, mock OAuth and AI are pre-configured
2. **Environment Files**: Keep `.env` local, use `.env.production` for prod
3. **Database**: SQLite for dev, PostgreSQL for production
4. **Secrets**: Use Replit Secrets or environment variables, never commit `.env`
5. **Deployment**: Test locally first, then deploy to staging, then production

---

## 🎯 Next Steps After Deployment

1. **Verify All Features**
   - [ ] Test OAuth login flows
   - [ ] Create test goal and tasks
   - [ ] Try AI coaching
   - [ ] Test payment flow

2. **Configure Monitoring**
   - [ ] Set up error alerts
   - [ ] Configure uptime monitoring
   - [ ] Enable analytics

3. **Launch Marketing**
   - [ ] Announce on social media
   - [ ] Email early access users
   - [ ] Submit to directories

---

## 💡 Pro Tips

### Development
```bash
# Auto-restart on changes
npm run dev

# Test production build locally
npm run build && cd dist && node index.js
```

### Debugging
```bash
# View real-time logs
pm2 logs lilove --lines 100

# Check health
curl http://localhost:5000/api/health
```

### Performance
```bash
# Analyze bundle size
npm run build -- --analyze

# Load testing
ab -n 1000 -c 10 http://localhost:5000/
```

---

## 🏆 Success Metrics

After deployment, monitor:
- ✅ Uptime > 99.9%
- ✅ Response time < 200ms
- ✅ Error rate < 0.1%
- ✅ User satisfaction > 4.5/5

---

## 📞 Support

- **Issues**: GitHub Issues
- **Docs**: `/docs` folder
- **Email**: support@lilove.org

---

**Remember**: All features are implemented and tested. You're ready to deploy! 🚀

---

*Last Updated: November 10, 2025*  
*Version: 1.0.0*
