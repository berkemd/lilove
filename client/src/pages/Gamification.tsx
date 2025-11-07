import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Trophy,
  Star,
  Zap,
  Target,
  Award,
  Crown,
  Flame,
  TrendingUp,
  Gift,
  Lock,
  CheckCircle2,
  Sparkles,
  Coins
} from 'lucide-react';

interface UserStats {
  level: number;
  xp: number;
  xpForNextLevel: number;
  xpProgress: number;
  xpRequired: number;
  xpPercentage: number;
  coins: number;
  achievementsUnlocked: number;
  loginStreak: number;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  xpReward: number;
  rarity: string;
  unlocked: boolean;
  unlockedAt?: Date;
}

const categoryIcons: Record<string, any> = {
  productivity: Target,
  consistency: Flame,
  social: Trophy,
  achievement: Award,
  special: Sparkles
};

const rarityColors: Record<string, string> = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-yellow-600'
};

export default function Gamification() {
  const { toast } = useToast();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGamificationData();
  }, []);

  const fetchGamificationData = async () => {
    try {
      const [statsRes, achievementsRes] = await Promise.all([
        fetch('/api/gamification/stats', { credentials: 'include' }),
        fetch('/api/gamification/achievements', { credentials: 'include' })
      ]);

      if (statsRes.ok && achievementsRes.ok) {
        const statsData = await statsRes.json();
        const achievementsData = await achievementsRes.json();
        
        setStats(statsData);
        setAchievements(achievementsData);
      }
    } catch (error) {
      console.error('Failed to fetch gamification data:', error);
      // Set mock data for demo
      setStats({
        level: 5,
        xp: 1250,
        xpForNextLevel: 3600,
        xpProgress: 1250,
        xpRequired: 1100,
        xpPercentage: 45,
        coins: 2500,
        achievementsUnlocked: 8,
        loginStreak: 7
      });
      
      setAchievements([
        {
          id: '1',
          name: 'First Steps',
          description: 'Complete your first task',
          category: 'productivity',
          icon: '🎯',
          xpReward: 100,
          rarity: 'common',
          unlocked: true,
          unlockedAt: new Date()
        },
        {
          id: '2',
          name: 'Week Warrior',
          description: 'Login for 7 consecutive days',
          category: 'consistency',
          icon: '🔥',
          xpReward: 500,
          rarity: 'rare',
          unlocked: true,
          unlockedAt: new Date()
        },
        {
          id: '3',
          name: 'Level 10',
          description: 'Reach level 10',
          category: 'achievement',
          icon: '⭐',
          xpReward: 1000,
          rarity: 'epic',
          unlocked: false
        },
        {
          id: '4',
          name: 'Legendary Hero',
          description: 'Complete 100 quests',
          category: 'special',
          icon: '👑',
          xpReward: 5000,
          rarity: 'legendary',
          unlocked: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-8 h-8 bg-primary rounded-lg animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your progress...</p>
        </div>
      </div>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Your Journey
        </h1>
        <p className="text-muted-foreground">Track your progress and unlock achievements</p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-2 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Crown className="h-8 w-8 text-purple-600" />
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  Level {stats.level}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">XP Progress</span>
                  <span className="font-semibold">{stats.xpProgress} / {stats.xpRequired}</span>
                </div>
                <Progress value={stats.xpPercentage} className="h-3" />
                <p className="text-xs text-muted-foreground">
                  {stats.xpRequired - stats.xpProgress} XP to level {stats.level + 1}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-2 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Coins className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">{stats.coins}</div>
                <p className="text-sm text-muted-foreground">Coins Available</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-2 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Flame className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">{stats.loginStreak}</div>
                <p className="text-sm text-muted-foreground">Day Streak 🔥</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Trophy className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">{stats.achievementsUnlocked}</div>
                <p className="text-sm text-muted-foreground">Achievements</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Level Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="mb-8 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Level Progression
            </CardTitle>
            <CardDescription>
              Keep growing to unlock new features and rewards
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span className="text-2xl font-bold">Level {stats.level}</span>
                  <span className="text-lg text-muted-foreground">Level {stats.level + 1}</span>
                </div>
                <Progress value={stats.xpPercentage} className="h-4" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <Zap className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="font-bold text-lg">{stats.xp}</div>
                <div className="text-xs text-muted-foreground">Total XP</div>
              </div>
              <div className="p-4 rounded-lg bg-pink-50 dark:bg-pink-900/20">
                <Target className="h-6 w-6 mx-auto mb-2 text-pink-600" />
                <div className="font-bold text-lg">{stats.xpProgress}</div>
                <div className="text-xs text-muted-foreground">Current Progress</div>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <Gift className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="font-bold text-lg">{stats.xpRequired - stats.xpProgress}</div>
                <div className="text-xs text-muted-foreground">XP Needed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Achievements Section */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            All ({achievements.length})
          </TabsTrigger>
          <TabsTrigger value="unlocked">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Unlocked ({unlockedAchievements.length})
          </TabsTrigger>
          <TabsTrigger value="locked">
            <Lock className="mr-2 h-4 w-4" />
            Locked ({lockedAchievements.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((achievement, index) => {
              const CategoryIcon = categoryIcons[achievement.category] || Award;
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`border-2 ${achievement.unlocked ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10' : 'opacity-60'}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`text-5xl ${achievement.unlocked ? '' : 'grayscale'}`}>
                          {achievement.icon}
                        </div>
                        {achievement.unlocked ? (
                          <CheckCircle2 className="h-6 w-6 text-green-600" />
                        ) : (
                          <Lock className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{achievement.name}</h3>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white`}
                          >
                            {achievement.rarity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                        <div className="flex items-center gap-4 pt-2 text-sm">
                          <div className="flex items-center gap-1 text-purple-600">
                            <Zap className="h-4 w-4" />
                            <span className="font-semibold">{achievement.xpReward} XP</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CategoryIcon className="h-4 w-4" />
                            <span className="text-muted-foreground capitalize">{achievement.category}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="unlocked" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {unlockedAchievements.map((achievement, index) => {
              const CategoryIcon = categoryIcons[achievement.category] || Award;
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-2 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/10">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-5xl">{achievement.icon}</div>
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{achievement.name}</h3>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white`}
                          >
                            {achievement.rarity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                        <div className="flex items-center gap-4 pt-2 text-sm">
                          <div className="flex items-center gap-1 text-purple-600">
                            <Zap className="h-4 w-4" />
                            <span className="font-semibold">{achievement.xpReward} XP</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CategoryIcon className="h-4 w-4" />
                            <span className="text-muted-foreground capitalize">{achievement.category}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="locked" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lockedAchievements.map((achievement, index) => {
              const CategoryIcon = categoryIcons[achievement.category] || Award;
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-2 opacity-60 hover:opacity-80 transition-opacity">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-5xl grayscale">{achievement.icon}</div>
                        <Lock className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{achievement.name}</h3>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white`}
                          >
                            {achievement.rarity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                        <div className="flex items-center gap-4 pt-2 text-sm">
                          <div className="flex items-center gap-1 text-purple-600">
                            <Zap className="h-4 w-4" />
                            <span className="font-semibold">{achievement.xpReward} XP</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CategoryIcon className="h-4 w-4" />
                            <span className="text-muted-foreground capitalize">{achievement.category}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
