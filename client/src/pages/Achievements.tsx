import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useCelebration } from "@/components/CelebrationAnimations";
import { 
  Trophy, 
  Medal, 
  Star, 
  Target,
  Zap,
  Calendar,
  TrendingUp,
  Award,
  Crown,
  Flame,
  Clock,
  CheckCircle2,
  Brain,
  Heart,
  Users,
  Shield,
  Sword,
  Gem,
  Gift,
  Book,
  MessageCircle,
  Share2,
  Sparkles,
  Activity,
  BarChart3,
  Coffee,
  Moon,
  Sun,
  Rocket,
  Mountain,
  Compass,
  Map,
  Flag,
  Lock,
  Unlock,
  Eye,
  DollarSign,
  Coins,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Puzzle,
  Gamepad2,
  Music,
  Headphones,
  Camera,
  Image,
  Film,
  Feather,
  Palette,
  Scissors,
  Archive,
  Package,
  ShoppingCart,
  Briefcase,
  Globe,
  Wifi,
  Cloud,
  Database
} from "lucide-react";

// Define achievement categories
const CATEGORIES = {
  all: { label: 'All', icon: Trophy },
  productivity: { label: 'Productivity', icon: Target },
  consistency: { label: 'Consistency', icon: Flame },
  learning: { label: 'Learning', icon: Book },
  social: { label: 'Social', icon: Users },
  special: { label: 'Special', icon: Star },
  mastery: { label: 'Mastery', icon: Crown },
  exploration: { label: 'Exploration', icon: Compass },
};

// Define tiers with colors and icons
const TIERS = {
  bronze: { label: 'Bronze', color: 'from-orange-400 to-orange-600', border: 'border-orange-500' },
  silver: { label: 'Silver', color: 'from-gray-300 to-gray-500', border: 'border-gray-400' },
  gold: { label: 'Gold', color: 'from-yellow-400 to-amber-600', border: 'border-yellow-500' },
  diamond: { label: 'Diamond', color: 'from-cyan-400 to-blue-600', border: 'border-cyan-500' }
};

// Comprehensive achievement definitions (50+)
const ALL_ACHIEVEMENTS = [
  // Productivity Achievements
  { id: 'prod-1', name: 'First Beautiful Step', description: 'Complete your first loving task', category: 'productivity', tier: 'bronze', xpReward: 50, icon: CheckCircle2, rarity: 'common', progress: { current: 1, target: 1 } },
  { id: 'prod-2', name: 'Task Master', description: 'Complete 10 tasks', category: 'productivity', tier: 'bronze', xpReward: 100, icon: CheckCircle2, rarity: 'common', progress: { current: 10, target: 10 } },
  { id: 'prod-3', name: 'Productive Day', description: 'Complete 5 tasks in one day', category: 'productivity', tier: 'silver', xpReward: 200, icon: Sun, rarity: 'uncommon', progress: { current: 5, target: 5 } },
  { id: 'prod-4', name: 'Goal Getter', description: 'Complete your first goal', category: 'productivity', tier: 'silver', xpReward: 300, icon: Target, rarity: 'uncommon', progress: { current: 1, target: 1 } },
  { id: 'prod-5', name: 'Multi-Tasker', description: 'Complete 50 tasks', category: 'productivity', tier: 'gold', xpReward: 500, icon: Activity, rarity: 'rare', progress: { current: 25, target: 50 } },
  { id: 'prod-6', name: 'Efficiency Expert', description: 'Complete 100 tasks', category: 'productivity', tier: 'gold', xpReward: 1000, icon: Zap, rarity: 'rare', progress: { current: 45, target: 100 } },
  { id: 'prod-7', name: 'Productivity Legend', description: 'Complete 500 tasks', category: 'productivity', tier: 'diamond', xpReward: 5000, icon: Crown, rarity: 'legendary', progress: { current: 125, target: 500 } },
  { id: 'prod-8', name: 'Speed Demon', description: 'Complete 10 tasks in under an hour', category: 'productivity', tier: 'gold', xpReward: 750, icon: Rocket, rarity: 'rare', progress: { current: 3, target: 10 } },
  { id: 'prod-9', name: 'Goal Crusher', description: 'Complete 10 goals', category: 'productivity', tier: 'diamond', xpReward: 2000, icon: Mountain, rarity: 'epic', progress: { current: 3, target: 10 } },

  // Consistency Achievements
  { id: 'cons-1', name: 'Daily Visitor', description: 'Login for the first time', category: 'consistency', tier: 'bronze', xpReward: 25, icon: Calendar, rarity: 'common', progress: { current: 1, target: 1 } },
  { id: 'cons-2', name: 'Weekend Warrior', description: 'Login 2 days in a row', category: 'consistency', tier: 'bronze', xpReward: 75, icon: Calendar, rarity: 'common', progress: { current: 2, target: 2 } },
  { id: 'cons-3', name: 'Week Streak', description: 'Maintain a 7-day streak', category: 'consistency', tier: 'silver', xpReward: 250, icon: Flame, rarity: 'uncommon', progress: { current: 7, target: 7 } },
  { id: 'cons-4', name: 'Fortnight Fighter', description: 'Maintain a 14-day streak', category: 'consistency', tier: 'silver', xpReward: 500, icon: Flame, rarity: 'uncommon', progress: { current: 14, target: 14 } },
  { id: 'cons-5', name: 'Monthly Marathon', description: 'Maintain a 30-day streak', category: 'consistency', tier: 'gold', xpReward: 1000, icon: Flame, rarity: 'rare', progress: { current: 14, target: 30 } },
  { id: 'cons-6', name: 'Quarterly Quest', description: 'Maintain a 90-day streak', category: 'consistency', tier: 'gold', xpReward: 3000, icon: Shield, rarity: 'epic', progress: { current: 14, target: 90 } },
  { id: 'cons-7', name: 'Yearly Dedication', description: 'Maintain a 365-day streak', category: 'consistency', tier: 'diamond', xpReward: 10000, icon: Crown, rarity: 'legendary', progress: { current: 14, target: 365 } },
  { id: 'cons-8', name: 'Early Bird', description: 'Complete tasks before 9 AM for 7 days', category: 'consistency', tier: 'silver', xpReward: 400, icon: Sun, rarity: 'uncommon', progress: { current: 3, target: 7 } },
  { id: 'cons-9', name: 'Night Owl', description: 'Complete tasks after 10 PM for 7 days', category: 'consistency', tier: 'silver', xpReward: 400, icon: Moon, rarity: 'uncommon', progress: { current: 2, target: 7 } },

  // Learning Achievements
  { id: 'learn-1', name: 'Knowledge Seeker', description: 'Complete first learning task', category: 'learning', tier: 'bronze', xpReward: 75, icon: Book, rarity: 'common', progress: { current: 1, target: 1 } },
  { id: 'learn-2', name: 'Study Session', description: 'Log 1 hour of learning', category: 'learning', tier: 'bronze', xpReward: 150, icon: Clock, rarity: 'common', progress: { current: 1, target: 1 } },
  { id: 'learn-3', name: 'Focused Learner', description: 'Log 10 hours of learning', category: 'learning', tier: 'silver', xpReward: 500, icon: Brain, rarity: 'uncommon', progress: { current: 5, target: 10 } },
  { id: 'learn-4', name: 'Knowledge Enthusiast', description: 'Log 50 hours of learning', category: 'learning', tier: 'gold', xpReward: 1500, icon: Brain, rarity: 'rare', progress: { current: 12, target: 50 } },
  { id: 'learn-5', name: 'Learning Machine', description: 'Log 100 hours of learning', category: 'learning', tier: 'gold', xpReward: 3000, icon: Zap, rarity: 'epic', progress: { current: 25, target: 100 } },
  { id: 'learn-6', name: 'Scholar', description: 'Complete 25 learning goals', category: 'learning', tier: 'diamond', xpReward: 5000, icon: Medal, rarity: 'legendary', progress: { current: 5, target: 25 } },
  { id: 'learn-7', name: 'Quick Learner', description: 'Complete 5 learning tasks in one day', category: 'learning', tier: 'silver', xpReward: 600, icon: Rocket, rarity: 'uncommon', progress: { current: 2, target: 5 } },
  { id: 'learn-8', name: 'Skill Master', description: 'Master 3 different skills', category: 'learning', tier: 'gold', xpReward: 2000, icon: Star, rarity: 'rare', progress: { current: 1, target: 3 } },

  // Social Achievements
  { id: 'social-1', name: 'Team Player', description: 'Share your first achievement', category: 'social', tier: 'bronze', xpReward: 100, icon: Share2, rarity: 'common', progress: { current: 0, target: 1 } },
  { id: 'social-2', name: 'Motivator', description: 'Send encouragement to 5 friends', category: 'social', tier: 'silver', xpReward: 300, icon: Heart, rarity: 'uncommon', progress: { current: 2, target: 5 } },
  { id: 'social-3', name: 'Community Leader', description: 'Reach top 10 in leaderboard', category: 'social', tier: 'gold', xpReward: 1000, icon: Users, rarity: 'rare', progress: { current: 0, target: 1 } },
  { id: 'social-4', name: 'Champion', description: 'Reach #1 in leaderboard', category: 'social', tier: 'diamond', xpReward: 5000, icon: Trophy, rarity: 'legendary', progress: { current: 0, target: 1 } },
  { id: 'social-5', name: 'Collaboration King', description: 'Complete 10 team challenges', category: 'social', tier: 'gold', xpReward: 1500, icon: Users, rarity: 'rare', progress: { current: 3, target: 10 } },
  { id: 'social-6', name: 'Mentor', description: 'Help 10 users achieve their goals', category: 'social', tier: 'gold', xpReward: 2000, icon: MessageCircle, rarity: 'epic', progress: { current: 2, target: 10 } },

  // Special Achievements
  { id: 'special-1', name: 'Perfect Week', description: 'Complete all tasks for 7 consecutive days', category: 'special', tier: 'gold', xpReward: 1500, icon: Star, rarity: 'rare', progress: { current: 3, target: 7 } },
  { id: 'special-2', name: 'Speed Run', description: 'Complete 20 tasks in one day', category: 'special', tier: 'diamond', xpReward: 3000, icon: Rocket, rarity: 'legendary', progress: { current: 8, target: 20 } },
  { id: 'special-3', name: 'Comeback Kid', description: 'Return after 30 days absence', category: 'special', tier: 'silver', xpReward: 500, icon: Gift, rarity: 'uncommon', progress: { current: 0, target: 1 } },
  { id: 'special-4', name: 'Lucky Strike', description: 'Win the jackpot on spin wheel', category: 'special', tier: 'diamond', xpReward: 10000, icon: Gem, rarity: 'legendary', progress: { current: 0, target: 1 } },
  { id: 'special-5', name: 'Perfectionist', description: 'Achieve 100% completion rate for 30 days', category: 'special', tier: 'diamond', xpReward: 8000, icon: Shield, rarity: 'legendary', progress: { current: 5, target: 30 } },
  { id: 'special-6', name: 'Jack of All Trades', description: 'Unlock achievements in all categories', category: 'special', tier: 'gold', xpReward: 2500, icon: Puzzle, rarity: 'epic', progress: { current: 4, target: 6 } },
  { id: 'special-7', name: 'Collector', description: 'Unlock 25 achievements', category: 'special', tier: 'silver', xpReward: 1000, icon: Archive, rarity: 'rare', progress: { current: 18, target: 25 } },
  { id: 'special-8', name: 'Completionist', description: 'Unlock 50 achievements', category: 'special', tier: 'diamond', xpReward: 10000, icon: Crown, rarity: 'legendary', progress: { current: 18, target: 50 } },

  // Mastery Achievements
  { id: 'mastery-1', name: 'Level 10', description: 'Reach level 10', category: 'mastery', tier: 'bronze', xpReward: 500, icon: Hexagon, rarity: 'common', progress: { current: 12, target: 10 } },
  { id: 'mastery-2', name: 'Level 25', description: 'Reach level 25', category: 'mastery', tier: 'silver', xpReward: 1000, icon: Square, rarity: 'uncommon', progress: { current: 12, target: 25 } },
  { id: 'mastery-3', name: 'Level 50', description: 'Reach level 50', category: 'mastery', tier: 'gold', xpReward: 3000, icon: Triangle, rarity: 'rare', progress: { current: 12, target: 50 } },
  { id: 'mastery-4', name: 'Level 100', description: 'Reach level 100', category: 'mastery', tier: 'diamond', xpReward: 10000, icon: Crown, rarity: 'legendary', progress: { current: 12, target: 100 } },
  { id: 'mastery-5', name: 'XP Millionaire', description: 'Earn 1,000,000 total XP', category: 'mastery', tier: 'diamond', xpReward: 20000, icon: Coins, rarity: 'legendary', progress: { current: 8450, target: 1000000 } },

  // Exploration Achievements  
  { id: 'explore-1', name: 'Explorer', description: 'Try all app features', category: 'exploration', tier: 'silver', xpReward: 750, icon: Compass, rarity: 'uncommon', progress: { current: 8, target: 10 } },
  { id: 'explore-2', name: 'Adventurer', description: 'Complete challenges in 5 categories', category: 'exploration', tier: 'gold', xpReward: 1500, icon: Map, rarity: 'rare', progress: { current: 3, target: 5 } },
  { id: 'explore-3', name: 'Pioneer', description: 'Be among first 100 users', category: 'exploration', tier: 'diamond', xpReward: 5000, icon: Flag, rarity: 'legendary', progress: { current: 1, target: 1 } },
  { id: 'explore-4', name: 'Beta Tester', description: 'Try 3 new features in beta', category: 'exploration', tier: 'gold', xpReward: 2000, icon: Feather, rarity: 'rare', progress: { current: 1, target: 3 } },
  { id: 'explore-5', name: 'Feedback Champion', description: 'Submit 10 pieces of feedback', category: 'exploration', tier: 'silver', xpReward: 1000, icon: MessageCircle, rarity: 'uncommon', progress: { current: 3, target: 10 } },
];

// Helper functions
function getAchievementColor(tier: string) {
  return TIERS[tier as keyof typeof TIERS]?.color || 'from-gray-400 to-gray-600';
}

function getAchievementBorder(tier: string) {
  return TIERS[tier as keyof typeof TIERS]?.border || 'border-gray-500';
}

export default function Achievements() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredAchievement, setHoveredAchievement] = useState<string | null>(null);
  const previousAchievementCountRef = useRef<number | null>(null);
  
  // Celebration animation for achievement unlock
  const { trigger: triggerAchievement, CelebrationOverlay: AchievementOverlay } = useCelebration('achievement');

  // Define types for achievements API response
  interface UserAchievementResponse {
    achievementId: string;
  }
  
  // Define type for processed achievement
  interface ProcessedAchievement {
    id: string;
    name: string;
    description: string;
    category: string;
    tier: string;
    xpReward: number;
    icon: React.ComponentType<{ className?: string }>;
    rarity: string;
    progress: { current: number; target: number };
    unlocked: boolean;
  }
  
  // Fetch user's achievements from API
  const { data: rawAchievements } = useQuery<UserAchievementResponse[]>({
    queryKey: ['/api/gamification/achievements'],
  });
  
  // Detect new achievements and trigger celebration
  useEffect(() => {
    const currentCount = rawAchievements?.length || 0;
    
    if (previousAchievementCountRef.current !== null && currentCount > previousAchievementCountRef.current && rawAchievements) {
      // A new achievement was unlocked - find it and trigger celebration
      const latestAchievementId = rawAchievements[rawAchievements.length - 1]?.achievementId;
      const achievementDef = ALL_ACHIEVEMENTS.find(a => a.id === latestAchievementId);
      if (achievementDef) {
        triggerAchievement({ achievementName: achievementDef.name, rarity: achievementDef.rarity });
      }
    }
    
    previousAchievementCountRef.current = currentCount;
  }, [rawAchievements, triggerAchievement]);
  
  // Process achievements with unlocked status
  const userAchievements: ProcessedAchievement[] = (() => {
    const unlockedIds = new Set(rawAchievements?.map((a) => a.achievementId) || []);
    return ALL_ACHIEVEMENTS.map(achievement => ({
      ...achievement,
      unlocked: unlockedIds.has(achievement.id),
      progress: achievement.progress
    }));
  })();

  // Define type for gamification profile
  interface GamificationProfileResponse {
    totalXP?: number;
    level?: number;
    currentStreak?: number;
    achievementCount?: number;
  }
  
  // Define type for computed user stats
  interface UserStats {
    totalXP: number;
    level: number;
    currentStreak: number;
    totalAchievements: number;
    completionRate: number;
  }
  
  // Fetch user stats
  const { data: rawUserStats } = useQuery<GamificationProfileResponse>({
    queryKey: ['/api/gamification/profile'],
  });
  
  // Compute user stats
  const userStats: UserStats = {
    totalXP: rawUserStats?.totalXP || 0,
    level: rawUserStats?.level || 1,
    currentStreak: rawUserStats?.currentStreak || 0,
    totalAchievements: rawUserStats?.achievementCount || 0,
    completionRate: Math.round((rawUserStats?.achievementCount || 0) / ALL_ACHIEVEMENTS.length * 100),
  };

  // Filter achievements based on category and search
  const filteredAchievements = (userAchievements || ALL_ACHIEVEMENTS).filter(achievement => {
    const categoryMatch = selectedCategory === 'all' || achievement.category === selectedCategory;
    const searchMatch = !searchQuery || 
      achievement.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      achievement.description.toLowerCase().includes(searchQuery.toLowerCase());
    return categoryMatch && searchMatch;
  });

  // Group achievements by tier
  const achievementsByTier = {
    diamond: filteredAchievements.filter(a => a.tier === 'diamond'),
    gold: filteredAchievements.filter(a => a.tier === 'gold'),
    silver: filteredAchievements.filter(a => a.tier === 'silver'),
    bronze: filteredAchievements.filter(a => a.tier === 'bronze'),
  };

  // Calculate stats by category
  const categoryStats = Object.entries(CATEGORIES).reduce((acc, [key, _]) => {
    if (key === 'all') return acc;
    const categoryAchievements = ALL_ACHIEVEMENTS.filter(a => a.category === key);
    const unlockedCount = categoryAchievements.filter(a => 
      userAchievements?.find(ua => ua.id === a.id && ua.unlocked)
    ).length;
    acc[key] = {
      total: categoryAchievements.length,
      unlocked: unlockedCount,
      percentage: Math.round((unlockedCount / categoryAchievements.length) * 100)
    };
    return acc;
  }, {} as Record<string, { total: number; unlocked: number; percentage: number }>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Achievements</h1>
        <p className="text-muted-foreground">
          Track your progress and unlock rewards
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unlocked</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.totalAchievements || 0} / {ALL_ACHIEVEMENTS.length}
            </div>
            <Progress value={userStats?.completionRate || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.completionRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Keep going!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP Earned</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(userStats?.totalXP || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Level {userStats?.level || 1}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.currentStreak || 0} days</div>
            <p className="text-xs text-muted-foreground mt-1">Keep the fire alive!</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
          {Object.entries(CATEGORIES).map(([key, { label, icon: Icon }]) => (
            <TabsTrigger key={key} value={key} className="flex items-center gap-1">
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6 space-y-6">
          {/* Category Progress */}
          {selectedCategory !== 'all' && categoryStats[selectedCategory] && (
            <Card>
              <CardHeader>
                <CardTitle>Category Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    {categoryStats[selectedCategory].unlocked} / {categoryStats[selectedCategory].total} Unlocked
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {categoryStats[selectedCategory].percentage}%
                  </span>
                </div>
                <Progress value={categoryStats[selectedCategory].percentage} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Achievements Grid by Tier */}
          <div className="space-y-8">
            {Object.entries(achievementsByTier).map(([tier, achievements]) => {
              if (achievements.length === 0) return null;
              
              return (
                <div key={tier} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${getAchievementColor(tier)} flex items-center justify-center`}>
                      <Gem className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold">{TIERS[tier as keyof typeof TIERS].label} Tier</h2>
                    <Badge variant="outline" className={getAchievementBorder(tier)}>
                      {achievements.filter(a => a.unlocked).length} / {achievements.length}
                    </Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                      {achievements.map((achievement, index) => {
                        const Icon = achievement.icon;
                        const isUnlocked = achievement.unlocked;
                        const progress = achievement.progress;
                        const progressPercent = Math.min((progress.current / progress.target) * 100, 100);

                        return (
                          <motion.div
                            key={achievement.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.05 }}
                            onHoverStart={() => setHoveredAchievement(achievement.id)}
                            onHoverEnd={() => setHoveredAchievement(null)}
                            whileHover={{ scale: 1.02 }}
                            className="relative"
                          >
                            <Card className={`h-full ${isUnlocked ? 'border-2' : 'opacity-75'} ${isUnlocked ? getAchievementBorder(tier) : ''}`}>
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className={`p-3 rounded-full ${isUnlocked ? `bg-gradient-to-br ${getAchievementColor(tier)}` : 'bg-gray-200 dark:bg-gray-800'}`}>
                                    {isUnlocked ? (
                                      <Icon className="h-6 w-6 text-white" />
                                    ) : (
                                      <Lock className="h-6 w-6 text-gray-400" />
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-semibold text-sm">{achievement.name}</h3>
                                      {isUnlocked && (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {achievement.description}
                                    </p>
                                    
                                    {/* Progress Bar */}
                                    {!isUnlocked && (
                                      <div className="pt-2 space-y-1">
                                        <Progress value={progressPercent} className="h-1.5" />
                                        <p className="text-xs text-muted-foreground">
                                          {progress.current} / {progress.target}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Rewards */}
                                    <div className="flex items-center gap-2 pt-2">
                                      <Badge variant="secondary" className="text-xs">
                                        <Zap className="h-3 w-3 mr-1" />
                                        {achievement.xpReward} XP
                                      </Badge>
                                      {achievement.rarity === 'legendary' && (
                                        <Badge variant="outline" className="text-xs border-purple-500 text-purple-500">
                                          Legendary
                                        </Badge>
                                      )}
                                      {achievement.rarity === 'epic' && (
                                        <Badge variant="outline" className="text-xs border-purple-400 text-purple-400">
                                          Epic
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Hover Effect */}
                                {hoveredAchievement === achievement.id && isUnlocked && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-orange-400/10 rounded-lg pointer-events-none"
                                  />
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      <AchievementOverlay />
    </div>
  );
}