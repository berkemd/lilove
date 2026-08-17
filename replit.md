# LiLove - Love Your Growth, Live Your Peak

## Overview

LiLove is an AI-powered performance coaching platform designed to foster personal growth through a warm, encouraging, and nurturing approach. It aims to transform traditional achievement-focused coaching into a supportive journey, celebrating every step of user progress. Key features include compassionate AI-driven guidance, gentle goal nurturing, supportive team collaboration, and joyful challenges. The platform offers loving analytics, warm AI coaching, and a supportive community. LiLove operates on a freemium model, with enhanced features available via subscription, welcoming all users to embrace their growth journey. The project's business vision is to make personal growth a joyful and celebrated experience, with market potential in the self-improvement and wellness sectors.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI/UX**: Custom design system with LiLoveTheme.ts, component system based on Radix UI primitives and shadcn/ui styling, supporting dark/light themes. Includes a Growth Sanctuary feature with animated forest-building, weather systems, animated creatures, parallax scrolling, and coin-based element unlocking.
- **State Management**: React Query for server state, local React state for UI.
- **Real-time Updates**: Socket.IO client.
- **Routing**: Wouter.
- **Mobile Development**: Bespoke mobile UI with `GrowthSanctuaryMobile.tsx` component and Firebase SDK integration.
- **Gamification**: Celebration animations (confetti, streak, trait unlock, achievement unlock), dynamic animation options.
- **Wellness**: Guided meditations, interactive breathing exercises, journaling.
- **Community**: Forum system with topic channels, posts, likes, replies, and anonymous posting.
- **Analytics**: Progress dashboard with mood trend charts, activity bar charts, engagement stats, date range filtering.

### Backend Architecture
- **Runtime**: Node.js with Express server.
- **Language**: TypeScript with ES modules.
- **AI Coaching Engine**: Intelligent recommendation system with GPT-4o-mini sentiment detection, mood indicators, urgency levels, and crisis banners.
- **Real-time Updates**: Socket.IO server for collaboration and notifications.
- **Gamification System**: Achievement tracking, leaderboards, challenge system, daily login, spin-wheel, quests, boss battles.
- **Goal Management**: Hierarchical goal system with sub-goals, progress tracking, and milestones.
- **Therapist Marketplace**: Foundation for professional connections, including therapist listings, reviews, bookings, and filtering.

### Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM.
- **Schema Design**: Normalized tables for users, goals, tasks, teams, achievements, performance analytics, sanctuary elements, user sanctuary states, evolution stages, sub-goals, therapists, and forum data.
- **File Storage**: Local filesystem for user avatars and achievement badges (uploads directory).
- **Session Management**: Connect-pg-simple for PostgreSQL-backed sessions.
- **Cross-Platform Sync**: Firestore for real-time synchronization across web and mobile (uid, coinBalance, stats, settings).

### Authentication and Authorization
- **Authentication**: Session-based authentication with Firebase Auth (Email/Password, Google, Apple sign-in). Account deletion includes a 30-day grace period and requires confirmation.
- **Authorization**: Role-based access with premium/free user tiers.

### Build Configuration
- **Node.js Runtime**: v20.12.2.
- **Vite**: v6.4.1.
- **TailwindCSS**: v3.4.18 with extensive custom theming.
- **Monorepo Structure**: Shared schema definitions for client and server.
- **CI/CD**: Comprehensive 13-domain BigTech-grade pipeline for engineering quality, AI/ML guardrails, design, localization, financial compliance, security audits, performance benchmarks, marketing automation, analytics validation, psychological safety, and management reporting.

## External Dependencies

- **Payment Processing**: Stripe integration (configured in free mode).
- **Database Hosting**: Neon Database (PostgreSQL-compatible serverless database).
- **Real-time Communication**: Socket.IO.
- **Authentication/Real-time Sync**: Firebase (Auth, Firestore).

## Recent Changes (January 2026)

### Teams Dashboard Enhancement
- Full team panel with member management (promote/demote/remove)
- Real-time team chat via Socket.IO
- Team leaderboard with weekly/monthly/all-time filtering
- Shared team goals with progress tracking
- Invite system for recruiting new members

### Avatar Rarity System
- 6 rarity tiers: Common → Uncommon → Rare → Epic → Legendary → Mythic
- Collection progress stats with percentage completion
- Animated glow effects for Legendary/Mythic items
- Rarity filters and price scaling (10-5000+ coins)

### Avatar Marketplace
- Full buy/sell/gift functionality between users
- Database tables: `marketplace_listings`, `gift_transactions`
- 8 API endpoints for listing management and transactions
- User search for gifting, 10% transaction fee, gift claim system

### Turkish Localization
- Comprehensive `tr.json` with 450+ translations
- Language switcher dropdown in header with globe icon
- All navigation and UI translated (Dashboard → Pano, Goals → Hedefler, etc.)
- Legal documents available in Turkish

### Habit UI Polish
- Circular progress indicators with SVG animations
- Animated streak counter with Framer Motion
- Daily completion summary with progress bar
- Micro-interactions: scale/bounce on completion
- Time-of-day indicators (morning/afternoon/evening)
- Compact mode toggle for mobile

### Legal Documents (KVKK/GDPR Compliant)
- Complete Privacy Policy and Terms of Service
- Real company info: LiLove Teknoloji A.Ş., Istanbul address
- KVKK (Turkish Data Protection Law) compliance
- AI data usage disclosure, third-party services listed
- Turkish law jurisdiction, Istanbul courts for disputes

### Production Optimization (January 2026)
- **Complete data-testid Coverage**: All interactive elements across Tasks, Habits, Teams, Goals, Dashboard have proper test identifiers following `{action}-{target}` naming convention
- **WCAG 2.1 AA Accessibility**: Added aria-labels to icon buttons, aria-controls to tabs, role attributes to progress indicators, sr-only labels for screen readers
- **Dark Mode Polish**: Fixed level colors, medals, rankings with proper dark: variants across Dashboard and Teams
- **Reduced Motion Support**: All Framer Motion animations respect prefers-reduced-motion via useReducedMotion hook
- **Error Boundaries**: FeatureErrorBoundary component wraps high-risk async sections (Dashboard, Goals, Tasks, Habits, Teams) with retry functionality
- **Production-Ready Logging**: Debug console statements wrapped in NODE_ENV checks or removed
- **Performance Optimization**: useMemo applied to derived data in Achievements and Challenges pages

### AI-Driven Features (January 2026)
- **AI Goal Wizard** (`AIGoalWizard.tsx`): 6-step conversational wizard using GPT-4o-mini to generate personalized action plans with milestones, tasks, and habits
- **Goal Plan Timeline** (`GoalPlanTimeline.tsx`): Drag-and-drop timeline visualization with @dnd-kit for task reordering
- **Adaptive Scheduling**: API endpoints `/api/ai-scheduler/*` for overdue task analysis, rescheduling recommendations, daily/weekly summaries with productivity tips
- **Natural Language Interface** (`NLCommandInput.tsx`): Chat-based command input for goal/task management via `/api/ai-assistant/command` endpoint
- **AI-Assisted Onboarding** (`AIOnboardingFlow.tsx`): 5-step wizard collecting growth areas, time commitment, and first goal; awards 100 XP welcome bonus
- **AI Privacy Settings** (`AIPrivacySettings.tsx`): KVKK-compliant toggles for AI personalization, history retention, mood analysis, and anonymous analytics; includes data export and deletion
- **Gamification Integration**: 50 XP + 25 coins for AI goal creation; proper XP transaction schema (delta, source, reason fields)

### Shop Digital Products System (January 2026)
- **Enhanced Shop Page** (`Shop.tsx`): Studio-quality design with Framer Motion animations, category tabs (All, Digital Forest, Avatar Items, Effects), and rarity filters
- **100+ Shop Items**: 56 sanctuary elements + avatar traits across 6 rarity tiers (Common → Uncommon → Rare → Epic → Legendary → Mythic)
- **Rarity Color System**: Gray (#9CA3AF), Green (#22C55E), Blue (#3B82F6), Purple (#A855F7), Gold (#F59E0B), Red (#EF4444 with glow)
- **Purchase Celebration** (`PurchaseCelebration` component): Full-screen overlay with 60-particle confetti burst, rarity-based glow effects, auto-dismiss after 3.5s
- **Shop Items Seed**: `/api/admin/seed-shop-items` endpoint to populate database with sanctuary elements and avatar traits
- **Unified Shop Interface**: Combines sanctuary elements and avatar traits into single shop view with ownership tracking

### Adaptive AI Re-planning Engine (January 2026)
- **Fogg Behavior Model** (`server/aiReplanning.ts`): B = Motivation × Ability × Prompt framework for behavior prediction
- **Motivation Analysis**: Tracks completion rates, streaks, habit performance with emoji-based scoring (🔥💪😊😐😴)
- **Ability Assessment**: Evaluates task complexity, overdue items, skill progression, and time commitment
- **Prompt Optimization**: Intelligent timing suggestions for maximum behavioral impact
- **Recommendation Types**: reschedule, simplify, break_down, motivate, pause with priority levels
- **API Endpoints**: `/api/ai-replanning/analyze/:goalId`, `/api/ai-replanning/recommendations`, `/api/ai-replanning/apply/:id`, `/api/ai-replanning/daily-summary`
- **AI Goal Assistant Dialog** (`AIGoalAssistant.tsx`): Health score visualization, Fogg model display, one-click recommendation actions
- **Database Schema**: `aiReplanningLogs` table for tracking recommendations and outcomes

## Agent Configuration

### Layered Knowledge System
Agent skills are stored in `.agent/skills/*.md` files with the following priority order:
1. `virtual-elite-team-skill.md` (HIGHEST) - Revolutionary Elite Orchestration System
2. `lilove-master-skill.md` (HIGH) - LiLove platform-specific knowledge
3. Other skill files as needed

### Core Principles
- **Big-Tech Excellence**: Apple/Meta/Google standards for code quality and UX
- **Revolutionary Uniqueness**: World-original features (predictive emotion AI, neuro-optimized rewards)
- **Psychological Design**: Fogg Behavior Model, flow state, variable rewards, habit loops
- **Autonomy & Precision**: Single-shot complex task execution

### Mandatory Standards
- Research integration for every decision (psychology, neurocognitive, design literature)
- AI-driven personalization (adaptive coaching, mood prediction)
- Sustainable monetization (freemium + virtual goods + subscriptions)
- PWA perfection (offline queue, push notifications, cross-platform sync)
- Delight features (confetti, Lottie animations, emotional feedback, micro-interactions)