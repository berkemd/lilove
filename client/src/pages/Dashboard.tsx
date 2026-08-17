import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FeatureErrorBoundary } from '@/components/FeatureErrorBoundary';
import { Link, useLocation } from 'wouter';
import DailyChallenges from '@/components/DailyChallenges';
import MoodSelector from '@/components/MoodSelector';
import LivingForest from '@/components/LivingForest';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';
import { queryClient } from '@/lib/queryClient';

// Type definitions for API responses
type GamificationProfile = {
  level: number;
  levelTitle: string;
  currentXP: number;
  xpToNextLevel: number;
  totalXP: number;
  progressToNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  achievementCount: number;
  coinBalance: number;
  rank: number;
  recentXP: any[];
};

type Achievement = {
  id: string;
  title: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  xpReward: number;
  coinReward: number;
  unlockedAt: string;
};

type LeaderboardEntry = {
  rank: number;
  userId: string;
  score: number;
  previousRank: number;
  username: string;
  displayName: string;
  profileImageUrl: string;
  avatarUrl: string;
  level: number;
  totalXP: number;
};

type UserStats = {
  tasksCompleted: number;
  goalsAchieved: number;
  hoursLogged: number;
  productivityScore: number;
  streakCount: number;
  totalXp: number;
  level: number;
};

type DailyInsight = {
  insight: string;
  motivation: string;
  focusArea: string;
  challenge?: string;
};
import { 
  Target, 
  TrendingUp, 
  Clock, 
  Award,
  ArrowRight,
  Brain,
  Zap,
  Flame,
  Sparkles,
  Trophy,
  Heart,
  Star,
  Crown,
  Coins,
  Shield,
  Sword,
  ChevronUp,
  Users,
  Activity,
  MessageSquare,
  ThumbsUp,
  UserPlus,
  Swords,
  Bell,
  Share2,
  Medal,
  Lightbulb,
  RefreshCw
} from "lucide-react";

// Motivational quotes
const MOTIVATIONAL_QUOTES = [
  "Love yourself first and everything else falls into line.",
  "Your growth journey is unique and beautiful—embrace it with love.",
  "Every step forward is a celebration of your commitment to yourself.",
  "You are worthy of all the growth and success you desire.",
  "Fall in love with taking care of yourself, mind, body, and spirit.",
  "Your journey matters, and you're exactly where you need to be.",
  "Growth blooms from self-love and compassionate persistence.",
  "Celebrate your progress—you're doing amazingly well."
];

// Helper function to get greeting based on time of day
function getGreeting(t: any) {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.greeting.morning');
  if (hour < 17) return t('dashboard.greeting.afternoon');
  return t('dashboard.greeting.evening');
}

// Level titles based on level ranges
function getLevelTitle(level: number, t: any): { title: string; icon: typeof Crown; color: string } {
  if (level < 10) return { title: t('dashboard.levelTitles.novice'), icon: Shield, color: 'text-gray-500 dark:text-gray-400' };
  if (level < 25) return { title: t('dashboard.levelTitles.apprentice'), icon: Zap, color: 'text-blue-500 dark:text-blue-400' };
  if (level < 50) return { title: t('dashboard.levelTitles.expert'), icon: Star, color: 'text-purple-500 dark:text-purple-400' };
  if (level < 75) return { title: t('dashboard.levelTitles.master'), icon: Trophy, color: 'text-yellow-500 dark:text-yellow-400' };
  if (level < 100) return { title: t('dashboard.levelTitles.grandMaster'), icon: Crown, color: 'text-orange-500 dark:text-orange-400' };
  return { title: t('dashboard.levelTitles.legend'), icon: Sword, color: 'text-red-500 dark:text-red-400' };
}

// Enhanced confetti animation component with more particles
function Confetti({ intensity = 20 }: { intensity?: number }) {
  return (
    <AnimatePresence>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(intensity)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              x: Math.random() * 100 - 50,
              y: -20,
              rotate: 0,
              opacity: 1 
            }}
            animate={{ 
              x: Math.random() * 200 - 100,
              y: 400,
              rotate: Math.random() * 720,
              opacity: 0 
            }}
            transition={{ 
              duration: 2 + Math.random() * 2,
              ease: "easeOut",
              delay: Math.random() * 0.5
            }}
            className="absolute"
            style={{ 
              left: `${Math.random() * 100}%`,
              top: 0 
            }}
          >
            <div className={`w-2 h-2 rounded-full ${
              ['bg-yellow-400', 'bg-green-400', 'bg-blue-400', 'bg-pink-400', 'bg-purple-400', 'bg-red-400'][i % 6]
            }`} />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}

// XP gain animation component
function XPGainAnimation({ amount, show }: { amount: number; show: boolean }) {
  if (!show) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 0, scale: 0.5 }}
      animate={{ opacity: 1, y: -30, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.8 }}
      transition={{ duration: 1 }}
      className="absolute top-0 right-0 font-bold text-lg text-yellow-500"
    >
      +{amount} XP
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const shouldReduceMotion = useReducedMotion();
  const [location, setLocation] = useLocation();
  const [showCelebration, setShowCelebration] = useState(false);
  const [showXPGain, setShowXPGain] = useState(false);
  const [xpAmount, setXPAmount] = useState(0);
  const [dailyQuote] = useState(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem('dailyQuote');
    if (stored) {
      const { quote, date } = JSON.parse(stored);
      if (date === today) return quote;
    }
    const newQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
    localStorage.setItem('dailyQuote', JSON.stringify({ quote: newQuote, date: today }));
    return newQuote;
  });

  // Handle OAuth success from mobile redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth') === 'success') {
      // Refetch user data to ensure session is loaded
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] }).then(() => {
        // Remove oauth parameter from URL
        params.delete('oauth');
        const newSearch = params.toString();
        const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // Show welcome message
        toast({
          title: t('auth.welcomeBack'),
          description: t('auth.welcomeMessage'),
        });
      });
    }
  }, [location, toast, t]);

  // Fetch gamification profile
  const { data: gamificationProfile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useQuery<GamificationProfile>({
    queryKey: ['/api/gamification/profile'],
    enabled: !!user,
    retry: 2,
  });

  // Fetch recent achievements
  const { data: recentAchievements, isLoading: achievementsLoading, error: achievementsError, refetch: refetchAchievements } = useQuery<Achievement[]>({
    queryKey: ['/api/gamification/achievements/recent'],
    enabled: !!user,
    retry: 2,
  });

  // Fetch leaderboard preview
  const { data: leaderboardData, isLoading: leaderboardLoading, error: leaderboardError, refetch: refetchLeaderboard } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/gamification/leaderboard/global'],
    select: (data) => data?.slice(0, 5), // Top 5 for preview
    enabled: !!user,
    retry: 2,
  });

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery<UserStats>({
    queryKey: ['/api/gamification/stats'],
    enabled: !!user,
    retry: 2,
  });

  // Fetch daily AI insight
  const { data: dailyInsight, isLoading: insightLoading, refetch: refetchInsight, error: insightError } = useQuery<DailyInsight>({
    queryKey: ['/api/ai-coach/daily-insight'],
    enabled: !!user,
    staleTime: 1000 * 60 * 60 * 6, // Cache for 6 hours
    retry: 1,
  });

  const level = gamificationProfile?.level || 1;
  const currentXP = gamificationProfile?.currentXP || 0;
  const xpToNextLevel = gamificationProfile?.xpToNextLevel || 100;
  const totalXP = gamificationProfile?.totalXP || 0;
  const currentStreak = gamificationProfile?.currentStreak || 0;
  const longestStreak = gamificationProfile?.longestStreak || 0;
  const achievementCount = gamificationProfile?.achievementCount || 0;
  const coinBalance = gamificationProfile?.coinBalance || 0;
  const rank = gamificationProfile?.rank || 0;

  const levelInfo = getLevelTitle(level, t);
  const xpProgress = (currentXP / xpToNextLevel) * 100;

  // Check for streak milestone
  useEffect(() => {
    const milestones = [7, 14, 30, 60, 100, 365];
    
    if (milestones.includes(currentStreak)) {
      setShowCelebration(true);
      toast({
        title: t('dashboard.milestoneAchieved'),
        description: t('dashboard.amazingStreak', { days: currentStreak }),
      });
      setTimeout(() => setShowCelebration(false), 5000);
    }
  }, [currentStreak, toast, t]);

  // Simulate XP gain for demo
  const simulateXPGain = (amount: number) => {
    setXPAmount(amount);
    setShowXPGain(true);
    setTimeout(() => setShowXPGain(false), 2000);
  };

  // Track page view
  useEffect(() => {
    if (user) {
      trackEvent('page_view', { page: 'dashboard', userId: user.id });
    }
  }, [user]);

  const displayName = user?.displayName || (user as any)?.firstName || (user as any)?.lastName || 'there';
  const greeting = getGreeting(t);

  return (
    <div className={`${isMobile ? 'space-y-6' : 'space-y-8'}`} data-testid="page-dashboard">
      {/* Welcome Header with Level & XP */}
      <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.5 }}
        >
          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
            <div className={isMobile ? 'text-center' : ''}>
              <h1 className={`${isMobile ? 'text-responsive-xl' : 'text-3xl'} font-bold tracking-tight`}>
                {greeting}, {displayName}!
              </h1>
              <p className={`text-muted-foreground ${isMobile ? 'text-responsive-sm' : 'text-lg'} ${isMobile ? 'mt-1' : ''}`}>
                {t('dashboard.subtitle')}
              </p>
            </div>
            
            {/* Level Badge */}
            <div className={`${isMobile ? 'text-center' : 'text-right'}`}>
              <div className={`flex items-center gap-2 ${isMobile ? 'justify-center' : 'justify-end'} mb-1`}>
                <levelInfo.icon className={`${isMobile ? 'h-7 w-7' : 'h-6 w-6'} ${levelInfo.color}`} />
                <span className={`${isMobile ? 'text-responsive-xl' : 'text-2xl'} font-bold`}>{t('dashboard.level')} {level}</span>
              </div>
              <Badge variant="outline" className={`${levelInfo.color} border-current ${isMobile ? 'px-3 py-1' : ''}`}>
                {levelInfo.title}
              </Badge>
            </div>
          </div>
        </motion.div>
        
        {/* XP Progress Bar */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2 }}
          className={`bg-card ${isMobile ? 'mobile-padding' : 'p-4'} rounded-lg border relative`}
        >
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'} mb-2`}>
            <div className="flex items-center gap-2">
              <Zap className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'} text-yellow-500`} />
              <span className={`${isMobile ? 'text-responsive-sm' : 'text-sm'} font-medium`}>{t('dashboard.experiencePoints')}</span>
            </div>
            <span className={`${isMobile ? 'text-responsive-sm' : 'text-sm'} text-muted-foreground`}>
              {currentXP} / {xpToNextLevel} XP
            </span>
          </div>
          <Progress value={xpProgress} className={`${isMobile ? 'h-4' : 'h-3'}`} />
          <div className={`flex justify-between mt-2 ${isMobile ? 'text-responsive-xs' : 'text-xs'} text-muted-foreground`}>
            <span>{t('dashboard.level')} {level}</span>
            <span>{Math.round(xpProgress)}% {t('dashboard.toLevel')} {level + 1}</span>
          </div>
          <AnimatePresence>
            <XPGainAnimation amount={xpAmount} show={showXPGain} />
          </AnimatePresence>
        </motion.div>

        {/* Daily Motivational Quote */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3 }}
          className={`bg-gradient-to-r from-primary/10 to-primary/5 ${isMobile ? 'mobile-padding' : 'p-4'} rounded-lg border border-primary/20`}
        >
          <div className={`flex items-start gap-3 ${isMobile ? 'text-center flex-col' : ''}`}>
            <Sparkles className={`${isMobile ? 'h-6 w-6 mx-auto' : 'h-5 w-5'} text-primary ${isMobile ? '' : 'mt-0.5'}`} />
            <div className={isMobile ? 'text-center' : ''}>
              <p className={`${isMobile ? 'text-responsive-sm' : 'text-sm'} font-medium text-muted-foreground`}>{t('dashboard.todaysReminder')}</p>
              <p className={`${isMobile ? 'text-responsive-base' : 'text-base'} italic mt-1`}>"{dailyQuote}"</p>
            </div>
          </div>
        </motion.div>

        {/* Mood Check-in */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.32 }}
          data-testid="mood-checkin"
        >
          <MoodSelector 
            userId={user?.id} 
            onMoodSelect={(mood) => {
              trackEvent('mood_selected', { mood, page: 'dashboard' });
            }}
          />
        </motion.div>

        {/* Growth Sanctuary - Animated Forest */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.33, type: "spring", stiffness: 100 }}
          data-testid="growth-sanctuary"
        >
          <Card className="overflow-hidden border-green-200 dark:border-green-800">
            <CardHeader className={`flex flex-row items-center justify-between gap-2 space-y-0 ${isMobile ? 'pb-2' : 'pb-3'} bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/50">
                  <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className={`${isMobile ? 'text-responsive-base' : 'text-lg'} font-semibold text-green-800 dark:text-green-200`}>
                    {t('dashboard.growthSanctuary')}
                  </CardTitle>
                  <p className="text-xs text-green-600 dark:text-green-400">{t('dashboard.watchForestGrow')}</p>
                </div>
              </div>
              <Link href="/growth-sanctuary">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-900/50"
                  data-testid="button-view-sanctuary"
                >
                  {t('dashboard.visitSanctuary')}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <LivingForest compact showProgress />
            </CardContent>
          </Card>
        </motion.div>

        {/* Daily AI Insight Card */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.35 }}
          data-testid="card-daily-insight"
        >
          <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
            <CardHeader className={`flex flex-row items-center justify-between gap-2 space-y-0 ${isMobile ? 'pb-2' : 'pb-3'}`}>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
                  <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <CardTitle className={`${isMobile ? 'text-responsive-base' : 'text-lg'} font-semibold text-amber-900 dark:text-amber-100`}>
                  {t('dashboard.todaysAIInsight')}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetchInsight()}
                disabled={insightLoading}
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-100/50 dark:text-amber-400 dark:hover:bg-amber-900/50"
                data-testid="button-refresh-insight"
              >
                <RefreshCw className={`h-4 w-4 ${insightLoading ? 'animate-spin' : ''}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {insightLoading ? (
                <div className="space-y-2">
                  <div className="h-4 bg-amber-200/50 dark:bg-amber-800/30 rounded animate-pulse" />
                  <div className="h-4 bg-amber-200/50 dark:bg-amber-800/30 rounded animate-pulse w-4/5" />
                  <div className="h-4 bg-amber-200/50 dark:bg-amber-800/30 rounded animate-pulse w-3/5" />
                </div>
              ) : insightError ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <p className="text-amber-700 dark:text-amber-300 text-sm">{t('dashboard.unableToLoadInsight')}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchInsight()}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
                    data-testid="button-retry-insight"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    {t('common.retry')}
                  </Button>
                </div>
              ) : dailyInsight ? (
                <>
                  <p className={`${isMobile ? 'text-responsive-sm' : 'text-sm'} text-amber-900 dark:text-amber-100 leading-relaxed`} data-testid="text-insight">
                    {dailyInsight.insight}
                  </p>
                  {dailyInsight.motivation && (
                    <p className={`${isMobile ? 'text-responsive-sm' : 'text-sm'} italic text-amber-700 dark:text-amber-300`} data-testid="text-motivation">
                      "{dailyInsight.motivation}"
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {dailyInsight.focusArea && (
                      <Badge variant="secondary" className="bg-amber-200/70 text-amber-800 dark:bg-amber-800/50 dark:text-amber-200" data-testid="badge-focus-area">
                        <Target className="h-3 w-3 mr-1" />
                        {t('dashboard.focus')}: {dailyInsight.focusArea}
                      </Badge>
                    )}
                    {dailyInsight.challenge && (
                      <Badge variant="secondary" className="bg-orange-200/70 text-orange-800 dark:bg-orange-800/50 dark:text-orange-200" data-testid="badge-challenge">
                        <Flame className="h-3 w-3 mr-1" />
                        {t('dashboard.challenge')}: {dailyInsight.challenge}
                      </Badge>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-amber-700 dark:text-amber-300 text-sm text-center py-2">
                  {t('dashboard.noInsightYet')}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Welcome Bonus Message for New Users */}
        {coinBalance === 1000 && (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.4 }}
            className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Coins className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                  <Sparkles className="h-5 w-5" /> {t('dashboard.welcomeBonus')}
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  {t('dashboard.freeCoinsMessage')}
                </p>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400">
                    <Coins className="h-4 w-4" />
                    <span className="font-medium">{t('dashboard.coinsAvailable')}</span>
                  </div>
                  <Link href="/pricing">
                    <Button 
                      variant="outline" 
                      size={isMobile ? "default" : "sm"} 
                      className={`border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-300 dark:hover:bg-yellow-900/30 ${isMobile ? 'touch-target' : ''}`}
                    >
                      {t('common.learnMore')}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Enhanced Gamification Metrics Grid */}
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'gap-6 md:grid-cols-2 lg:grid-cols-5'}`}>
        {profileLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} data-testid={`skeleton-metric-${i}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : profileError ? (
          <Card className={`${isMobile ? '' : 'lg:col-span-5'}`} data-testid="error-metrics">
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">{t('dashboard.unableToLoadStats')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchProfile()}
                  data-testid="button-retry-profile"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  {t('common.retry')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card data-testid="metric-streak" className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.currentStreak')}</CardTitle>
                <Flame className={`h-4 w-4 ${currentStreak >= 7 ? 'text-orange-500 animate-pulse' : 'text-gray-400 dark:text-gray-500'}`} />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold" data-testid="value-streak">{currentStreak}</div>
                  <span className="text-sm text-muted-foreground">{t('dashboard.days')}</span>
                </div>
                {currentStreak >= 7 && (
                  <Badge variant="secondary" className="mt-2 bg-gradient-to-r from-orange-500 to-red-500 text-white">
                    <Flame className="h-3 w-3 mr-1" />
                    {t('dashboard.onFire')}
                  </Badge>
                )}
                <Progress value={longestStreak > 0 ? (currentStreak / longestStreak) * 100 : 0} className="mt-2 h-1" />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.best')}: {longestStreak} {t('dashboard.days')}
                </p>
              </CardContent>
              {showCelebration && (
                <div className="absolute inset-0">
                  <Confetti intensity={30} />
                </div>
              )}
            </Card>

            <Card data-testid="metric-coins">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.coins')}</CardTitle>
                <Coins className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-coins">{coinBalance.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.spendInShop')}
                </p>
                <Link href="/shop">
                  <Button 
                    size={isMobile ? "default" : "sm"} 
                    variant="outline" 
                    className={`mt-2 w-full ${isMobile ? 'touch-target' : ''}`}
                    data-testid="button-visit-shop"
                  >
                    {t('dashboard.visitShop')}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card data-testid="metric-achievements">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.achievements')}</CardTitle>
                <Award className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-achievements">{achievementCount}</div>
                <p className="text-xs text-muted-foreground">
                  {recentAchievements?.length || 0} {t('dashboard.newThisWeek')}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-rank">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.globalRank')}</CardTitle>
                <Trophy className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold" data-testid="value-rank">#{rank || '—'}</span>
                  {rank && rank <= 100 && (
                    <ChevronUp className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {rank ? t('dashboard.topPercent', { percent: Math.max(1, Math.round((rank / 10000) * 100)) }) : t('dashboard.notRankedYet')}
                </p>
              </CardContent>
            </Card>

            <Card data-testid="metric-total-xp">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dashboard.totalXp')}</CardTitle>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-total-xp">{(totalXP || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {t('dashboard.lifetimeEarned')}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <FeatureErrorBoundary featureName="Dashboard Content">
      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'gap-6 lg:grid-cols-3'}`}>
        {/* Recent Achievements Showcase */}
        <Card className="lg:col-span-1" data-testid="section-achievements">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-500" />
                {t('dashboard.recentAchievements')}
              </CardTitle>
              <Link href="/achievements">
                <Button 
                  variant="ghost" 
                  size={isMobile ? "default" : "sm"} 
                  className={isMobile ? 'touch-target' : ''}
                  data-testid="button-view-all-achievements"
                >
                  {t('common.viewAll')} <ArrowRight className={`ml-2 ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievementsLoading ? (
              <div className="space-y-3" data-testid="skeleton-achievements">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : achievementsError ? (
              <div className="flex flex-col items-center gap-3 py-6" data-testid="error-achievements">
                <p className="text-sm text-muted-foreground">{t('dashboard.unableToLoadAchievements')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchAchievements()}
                  data-testid="button-retry-achievements"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  {t('common.retry')}
                </Button>
              </div>
            ) : !recentAchievements || recentAchievements.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6" data-testid="empty-achievements">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Award className="h-6 w-6 text-purple-500" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {t('dashboard.startYourJourney')}
                </p>
                <Link href="/challenges">
                  <Button size="sm" data-testid="button-start-challenge">
                    <Flame className="h-4 w-4 mr-2" />
                    {t('dashboard.startChallenge')}
                  </Button>
                </Link>
              </div>
            ) : (
              <AnimatePresence>
                {recentAchievements.slice(0, 5).map((achievement, index: number) => (
                  <motion.div
                    key={achievement.id}
                    initial={shouldReduceMotion ? false : { opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { delay: index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover-elevate"
                  >
                    <div className={`p-2 rounded-full ${
                      achievement.tier === 'diamond' ? 'bg-gradient-to-br from-cyan-400 to-blue-600' :
                      achievement.tier === 'gold' ? 'bg-gradient-to-br from-yellow-400 to-amber-600' :
                      achievement.tier === 'silver' ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                      'bg-gradient-to-br from-orange-400 to-orange-600'
                    }`}>
                      <Trophy className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{achievement.title || achievement.name}</p>
                      <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      +{achievement.xpReward} XP
                    </Badge>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>

        {/* Mini Leaderboard */}
        <Card className="lg:col-span-1" data-testid="section-leaderboard">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                {t('dashboard.topPlayers')}
              </CardTitle>
              <Link href="/leaderboard">
                <Button 
                  variant="ghost" 
                  size={isMobile ? "default" : "sm"} 
                  className={isMobile ? 'touch-target' : ''}
                  data-testid="button-view-leaderboard"
                >
                  {t('common.viewAll')} <ArrowRight className={`ml-2 ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboardLoading ? (
              <div className="space-y-3" data-testid="skeleton-leaderboard">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : leaderboardError ? (
              <div className="flex flex-col items-center gap-3 py-6" data-testid="error-leaderboard">
                <p className="text-sm text-muted-foreground">{t('dashboard.unableToLoadLeaderboard')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchLeaderboard()}
                  data-testid="button-retry-leaderboard"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  {t('common.retry')}
                </Button>
              </div>
            ) : !leaderboardData || leaderboardData.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6" data-testid="empty-leaderboard">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <Trophy className="h-6 w-6 text-yellow-500" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {t('dashboard.beFirstOnLeaderboard')}
                </p>
                <Link href="/goals">
                  <Button size="sm" data-testid="button-set-goal">
                    <Target className="h-4 w-4 mr-2" />
                    {t('dashboard.setGoal')}
                  </Button>
                </Link>
              </div>
            ) : (
              <AnimatePresence>
                {leaderboardData.map((player, index: number) => (
                  <motion.div
                    key={player.userId}
                    initial={shouldReduceMotion ? false : { opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={shouldReduceMotion ? { duration: 0 } : { delay: index * 0.1 }}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      player.userId === user?.id ? 'bg-primary/10 border border-primary/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 font-bold">
                      {index === 0 ? <Medal className="h-5 w-5 text-yellow-500 dark:text-yellow-400" /> : 
                       index === 1 ? <Medal className="h-5 w-5 text-gray-400 dark:text-gray-300" /> : 
                       index === 2 ? <Medal className="h-5 w-5 text-orange-600 dark:text-orange-500" /> : 
                       `#${index + 1}`}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={player.profileImageUrl || player.avatarUrl} />
                      <AvatarFallback>{player.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {player.displayName || 'Anonymous'}
                        {player.userId === user?.id && <Badge variant="outline" className="ml-2 text-xs">{t('dashboard.you')}</Badge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('dashboard.level')} {player.level} • {player.totalXP.toLocaleString()} XP
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Stats */}
        <Card className="lg:col-span-1" data-testid="section-quick-stats">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              {t('dashboard.yourProgress')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statsLoading ? (
              <div className="space-y-4" data-testid="skeleton-stats">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-1 items-end h-16">
                    {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <Skeleton key={i} className="flex-1 h-full" style={{ height: `${30 + Math.random() * 50}%` }} />
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            ) : statsError ? (
              <div className="flex flex-col items-center gap-3 py-6" data-testid="error-stats">
                <p className="text-sm text-muted-foreground">{t('dashboard.unableToLoadProgressData')}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchStats()}
                  data-testid="button-retry-stats"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  {t('common.retry')}
                </Button>
              </div>
            ) : (
              <>
                {/* Weekly Activity Graph */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('dashboard.weeklyActivity')}</p>
                  <div className="flex gap-1 items-end h-16">
                    {(userStats?.tasksCompleted ? [40, 65, 30, 80, 55, 90, 70] : [0, 0, 0, 0, 0, 0, 0]).map((height, i) => (
                      <motion.div
                        key={i}
                        initial={shouldReduceMotion ? false : { height: 0 }}
                        animate={{ height: `${Math.max(height, 5)}%` }}
                        transition={shouldReduceMotion ? { duration: 0 } : { delay: i * 0.1, duration: 0.5 }}
                        className={`flex-1 rounded-t ${height > 0 ? 'bg-gradient-to-t from-blue-500 to-blue-300' : 'bg-muted'}`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('dashboard.weekdays.mon')}</span>
                    <span>{t('dashboard.weekdays.tue')}</span>
                    <span>{t('dashboard.weekdays.wed')}</span>
                    <span>{t('dashboard.weekdays.thu')}</span>
                    <span>{t('dashboard.weekdays.fri')}</span>
                    <span>{t('dashboard.weekdays.sat')}</span>
                    <span>{t('dashboard.weekdays.sun')}</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.tasksCompleted')}</span>
                    <span className="font-medium" data-testid="stat-tasks">{userStats?.tasksCompleted ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.goalsAchieved')}</span>
                    <span className="font-medium" data-testid="stat-goals">{userStats?.goalsAchieved ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.hoursLogged')}</span>
                    <span className="font-medium" data-testid="stat-hours">{userStats?.hoursLogged ?? 0}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('dashboard.productivityScore')}</span>
                    <span className="font-medium" data-testid="stat-productivity">{userStats?.productivityScore ?? 0}%</span>
                  </div>
                </div>
              </>
            )}

            {/* Quick Actions */}
            <div className="space-y-2 pt-2 border-t">
              <Link href="/goals">
                <Button variant="outline" className={`w-full justify-start ${isMobile ? 'touch-target' : ''}`} data-testid="button-add-goal">
                  <Target className="mr-2 h-4 w-4" />
                  {t('dashboard.createNewGoal')}
                </Button>
              </Link>
              <Link href="/achievements">
                <Button variant="outline" className={`w-full justify-start ${isMobile ? 'touch-target' : ''}`} data-testid="button-check-achievements">
                  <Award className="mr-2 h-4 w-4" />
                  {t('dashboard.browseAchievements')}
                </Button>
              </Link>
              <Link href="/coach">
                <Button variant="outline" className={`w-full justify-start ${isMobile ? 'touch-target' : ''}`} data-testid="button-chat-ai">
                  <Brain className="mr-2 h-4 w-4" />
                  {t('dashboard.chatWithAICoach')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      </FeatureErrorBoundary>

      {/* Social Feed Section */}
      <FeatureErrorBoundary featureName="Social Feed">
      <Card className="mb-8" data-testid="section-social-feed">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Social Activity
            </CardTitle>
            <Link href="/teams">
              <Button 
                variant="ghost" 
                size={isMobile ? "default" : "sm"} 
                className={isMobile ? 'touch-target' : ''}
                data-testid="button-view-teams"
              >
                View Teams <ArrowRight className={`ml-2 ${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-8" data-testid="empty-social-feed">
            <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <Users className="h-8 w-8 text-purple-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Connect with Others</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Join teams and challenges to see activity from your community. 
                Celebrate achievements together!
              </p>
            </div>
            <div className={`flex ${isMobile ? 'flex-col w-full' : 'flex-row'} gap-2`}>
              <Link href="/teams" className={isMobile ? 'w-full' : ''}>
                <Button className={isMobile ? 'w-full touch-target' : ''} data-testid="button-join-team">
                  <Users className="h-4 w-4 mr-2" />
                  Join a Team
                </Button>
              </Link>
              <Link href="/challenges" className={isMobile ? 'w-full' : ''}>
                <Button variant="outline" className={isMobile ? 'w-full touch-target' : ''} data-testid="button-browse-challenges">
                  <Swords className="h-4 w-4 mr-2" />
                  Browse Challenges
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
      </FeatureErrorBoundary>

      {/* Daily Challenges Section */}
      <FeatureErrorBoundary featureName="Daily Challenges">
        <DailyChallenges />
      </FeatureErrorBoundary>

      {/* Safety Resources Footer */}
      <div className="mt-8 pt-6 border-t" data-testid="footer-safety-resources">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
          <Heart className="h-4 w-4 text-primary" />
          <span>If you're struggling, help is available.</span>
          <Link href="/safety-resources">
            <Button variant="ghost" className="h-auto p-0 text-primary underline" data-testid="link-safety-resources-footer">
              Safety Resources
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}