import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
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
  Flame as Fire,
  Clock,
  CheckCircle2,
  Brain,
  Heart,
  Users,
  Shield,
  Sword,
  Gem as Diamond,
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
  Database,
  RotateCcw,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
  ChevronRight,
  Settings
} from "lucide-react";

// Types for gamification data
interface GamificationProfile {
  userId: string;
  totalXp: number;
  currentLevel: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressToNext: number;
  levelTitle: string;
  coinBalance: number;
  loginStreak: number;
  totalTasksCompleted: number;
  totalGoalsCompleted: number;
  lastLoginDate: string;
}

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  tier: number;
  xpReward: number;
  coinReward: number;
  rarity: string;
  iconUrl?: string;
  hidden: boolean;
  seasonal: boolean;
  unlockedAt?: string;
  progress?: number;
  showcased?: boolean;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  challengeType: string;
  targetValue: number;
  xpReward: number;
  coinReward: number;
  difficulty: string;
  activeDate: string;
  progress?: number;
  completed?: boolean;
  claimedReward?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  previousRank?: number;
  username: string;
  displayName?: string;
  profileImageUrl?: string;
}

interface SpinWheelReward {
  id: string;
  rewardType: string;
  rewardValue: number;
  probability: string;
  rarity: string;
  displayName: string;
}

// Icon mapping for achievements
const achievementIcons: Record<string, any> = {
  productivity: Target,
  consistency: Fire,
  learning: Brain,
  social: Users,
  special: Crown,
  first_task: CheckCircle2,
  task_10: Target,
  task_50: Award,
  task_100: Trophy,
  task_500: Crown,
  streak_3: Fire,
  streak_7: Fire,
  streak_30: Sun,
  level_5: Star,
  level_10: Medal,
  achievement_unlock: Diamond,
  daily_challenge: Calendar,
  spin_winner: Gift,
  social_butterfly: Heart,
  team_player: Users,
  mentor: Book,
  explorer: Compass,
  perfectionist: Diamond,
  night_owl: Moon,
  early_bird: Sun,
  default: Trophy
};

// Rarity colors
const rarityColors = {
  common: "bg-gray-500",
  uncommon: "bg-green-500", 
  rare: "bg-blue-500",
  epic: "bg-purple-500",
  legendary: "bg-yellow-500"
};

// Difficulty colors
const difficultyColors = {
  easy: "bg-green-500",
  medium: "bg-yellow-500", 
  hard: "bg-red-500"
};

async function getFirebaseToken(): Promise<string | null> {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error('Failed to get Firebase token:', error);
    return null;
  }
}

export default function Gamification() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [spinWheelSpinning, setSpinWheelSpinning] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch gamification profile
  const { data: profile, isLoading: profileLoading } = useQuery<GamificationProfile>({
    queryKey: ['/api/gamification/profile'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Celebration animations
  const { trigger: triggerConfetti, CelebrationOverlay: ConfettiOverlay } = useCelebration('confetti');
  const { trigger: triggerStreak, CelebrationOverlay: StreakOverlay } = useCelebration('streak');

  // Fetch recent achievements
  const { data: recentAchievements, isLoading: achievementsLoading } = useQuery<Achievement[]>({
    queryKey: ['/api/gamification/achievements/recent'],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch all achievements
  const { data: allAchievements, isLoading: allAchievementsLoading } = useQuery<Achievement[]>({
    queryKey: ['/api/gamification/achievements'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch daily challenges
  const { data: dailyChallenges, isLoading: challengesLoading } = useQuery<DailyChallenge[]>({
    queryKey: ['/api/gamification/challenges/daily'],
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch global leaderboard
  const { data: globalLeaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/gamification/leaderboard/global'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch spin wheel config
  const { data: spinWheelConfig } = useQuery<SpinWheelReward[]>({
    queryKey: ['/api/gamification/spin-wheel/config'],
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  // Daily login mutation
  const dailyLoginMutation = useMutation({
    mutationFn: async () => {
      const firebaseToken = await getFirebaseToken();
      const headers: Record<string, string> = {};
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
      }
      const response = await fetch('/api/gamification/daily-login', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      if (!response.ok) throw new Error('Failed to claim daily login');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/profile'] });
      triggerStreak({ streakDays: data?.loginStreak || profile?.loginStreak || 1 });
      toast({
        title: "Daily Login Claimed!",
        description: "You've earned your daily XP and coin bonus.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to claim daily login bonus.",
        variant: "destructive",
      });
    },
  });

  // Spin wheel mutation
  const spinWheelMutation = useMutation({
    mutationFn: async () => {
      const firebaseToken = await getFirebaseToken();
      const headers: Record<string, string> = {};
      if (firebaseToken) {
        headers['Authorization'] = `Bearer ${firebaseToken}`;
      }
      const response = await fetch('/api/gamification/spin-wheel', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      if (!response.ok) throw new Error('Failed to spin wheel');
      return response.json();
    },
    onSuccess: (reward) => {
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/profile'] });
      triggerConfetti();
      toast({
        title: "Spin Successful!",
        description: `You won: ${reward.displayName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Spin Failed",
        description: error.message || "Failed to spin the wheel.",
        variant: "destructive",
      });
    },
  });

  // Handle spin wheel
  const handleSpinWheel = async () => {
    setSpinWheelSpinning(true);
    try {
      await spinWheelMutation.mutateAsync();
    } finally {
      setTimeout(() => setSpinWheelSpinning(false), 2000); // Animation duration
    }
  };

  // Calculate user rank in global leaderboard
  const userRank = (globalLeaderboard?.findIndex(entry => entry.userId === profile?.userId) ?? -1) + 1 || 0;

  if (profileLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading gamification data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-gamification">
      {/* Header with XP and Level Info */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <div className="flex items-center justify-center gap-4">
          <Gamepad2 className="h-10 w-10 text-primary" />
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-gamification-title">Gamification Hub</h1>
            <p className="text-muted-foreground">Track your progress and earn rewards</p>
          </div>
        </div>

        {profile && (
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center gap-6 bg-muted/50 rounded-lg p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary" data-testid="text-user-level">
                  Level {profile.currentLevel}
                </div>
                <div className="text-sm text-muted-foreground">{profile.levelTitle}</div>
              </div>
              
              <div className="w-64">
                <div className="flex justify-between text-sm mb-1">
                  <span data-testid="text-current-xp">{profile.currentLevelXp} XP</span>
                  <span data-testid="text-next-level-xp">{profile.nextLevelXp} XP</span>
                </div>
                <Progress 
                  value={profile.progressToNext} 
                  className="h-3"
                  data-testid="progress-xp"
                />
                <div className="text-xs text-center mt-1 text-muted-foreground">
                  {profile.progressToNext.toFixed(1)}% to next level
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500" data-testid="text-coin-balance">
                  {profile.coinBalance}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Coins className="w-4 h-4" />
                  Coins
                </div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500" data-testid="text-login-streak">
                  {profile.loginStreak}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Fire className="w-4 h-4" />
                  Day Streak
                </div>
              </div>
            </div>

            <Button 
              onClick={() => dailyLoginMutation.mutate()}
              disabled={dailyLoginMutation.isPending}
              className="w-fit"
              data-testid="button-daily-login"
            >
              {dailyLoginMutation.isPending ? "Claiming..." : "Claim Daily Bonus"}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-gamification">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements" data-testid="tab-achievements">Achievements</TabsTrigger>
          <TabsTrigger value="challenges" data-testid="tab-challenges">Challenges</TabsTrigger>
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="rewards" data-testid="tab-rewards">Rewards</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Quick Stats */}
            <Card data-testid="card-quick-stats">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile && (
                  <>
                    <div className="flex justify-between">
                      <span>Total XP:</span>
                      <Badge variant="secondary" data-testid="badge-total-xp">{profile.totalXp}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Tasks Completed:</span>
                      <Badge variant="secondary" data-testid="badge-tasks-completed">{profile.totalTasksCompleted}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Goals Completed:</span>
                      <Badge variant="secondary" data-testid="badge-goals-completed">{profile.totalGoalsCompleted}</Badge>
                    </div>
                    {userRank > 0 && (
                      <div className="flex justify-between">
                        <span>Global Rank:</span>
                        <Badge variant="outline" data-testid="badge-global-rank">#{userRank}</Badge>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Recent Achievements */}
            <Card data-testid="card-recent-achievements">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Recent Achievements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  {achievementsLoading ? (
                    <div className="text-center text-muted-foreground">Loading...</div>
                  ) : recentAchievements && recentAchievements.length > 0 ? (
                    <div className="space-y-2">
                      {recentAchievements.slice(0, 3).map((achievement) => {
                        const IconComponent = achievementIcons[achievement.key] || achievementIcons.default;
                        return (
                          <div key={achievement.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                            <IconComponent className="w-6 h-6 text-primary" />
                            <div className="flex-1">
                              <div className="font-medium text-sm" data-testid={`text-achievement-${achievement.key}`}>
                                {achievement.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                +{achievement.xpReward} XP, +{achievement.coinReward} coins
                              </div>
                            </div>
                            <Badge className={rarityColors[achievement.rarity as keyof typeof rarityColors] || rarityColors.common}>
                              {achievement.rarity}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">No recent achievements</div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Today's Challenges */}
            <Card data-testid="card-daily-challenges">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Today's Challenges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-40">
                  {challengesLoading ? (
                    <div className="text-center text-muted-foreground">Loading...</div>
                  ) : dailyChallenges && dailyChallenges.length > 0 ? (
                    <div className="space-y-3">
                      {dailyChallenges.map((challenge) => (
                        <div key={challenge.id} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm" data-testid={`text-challenge-${challenge.id}`}>
                              {challenge.title}
                            </div>
                            <Badge className={difficultyColors[challenge.difficulty as keyof typeof difficultyColors]}>
                              {challenge.difficulty}
                            </Badge>
                          </div>
                          <Progress 
                            value={(challenge.progress || 0) / challenge.targetValue * 100}
                            className="h-2"
                            data-testid={`progress-challenge-${challenge.id}`}
                          />
                          <div className="text-xs text-muted-foreground flex justify-between">
                            <span>{challenge.progress || 0} / {challenge.targetValue}</span>
                            <span>+{challenge.xpReward} XP</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground">No challenges available</div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Spin Wheel Section */}
          <Card data-testid="card-spin-wheel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Daily Spin Wheel
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <div className="flex justify-center">
                <motion.div
                  animate={{ rotate: spinWheelSpinning ? 360 * 5 : 0 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                  className="w-32 h-32 rounded-full border-8 border-primary flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500"
                  data-testid="wheel-spinner"
                >
                  <Gift className="w-12 h-12 text-white" />
                </motion.div>
              </div>
              <Button
                onClick={handleSpinWheel}
                disabled={spinWheelSpinning || spinWheelMutation.isPending}
                size="lg"
                data-testid="button-spin-wheel"
              >
                {spinWheelSpinning ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  "Spin the Wheel!"
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Get your free daily spin or use 10 coins for extra spins
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAchievementsLoading ? (
              <div className="col-span-full text-center text-muted-foreground">Loading achievements...</div>
            ) : allAchievements && allAchievements.length > 0 ? (
              allAchievements.map((achievement) => {
                const IconComponent = achievementIcons[achievement.key] || achievementIcons.default;
                const isUnlocked = !!achievement.unlockedAt;
                
                return (
                  <Card 
                    key={achievement.id} 
                    className={`${isUnlocked ? 'border-primary' : 'opacity-60'} transition-all hover:scale-105`}
                    data-testid={`card-achievement-${achievement.key}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${isUnlocked ? 'bg-primary/10' : 'bg-muted'}`}>
                          {isUnlocked ? (
                            <IconComponent className="w-6 h-6 text-primary" />
                          ) : (
                            <Lock className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold" data-testid={`text-achievement-name-${achievement.key}`}>
                            {achievement.name}
                          </div>
                          <div className="text-sm text-muted-foreground mb-2">
                            {achievement.description}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{achievement.category}</Badge>
                            <Badge className={rarityColors[achievement.rarity as keyof typeof rarityColors]}>
                              {achievement.rarity}
                            </Badge>
                          </div>
                          {achievement.progress !== undefined && !isUnlocked && (
                            <Progress value={achievement.progress} className="mb-2" />
                          )}
                          <div className="text-xs text-muted-foreground">
                            +{achievement.xpReward} XP • +{achievement.coinReward} coins
                          </div>
                          {isUnlocked && achievement.unlockedAt && (
                            <div className="text-xs text-green-600 mt-1">
                              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center text-muted-foreground">No achievements available</div>
            )}
          </div>
        </TabsContent>

        {/* Challenges Tab */}
        <TabsContent value="challenges" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {challengesLoading ? (
              <div className="col-span-full text-center text-muted-foreground">Loading challenges...</div>
            ) : dailyChallenges && dailyChallenges.length > 0 ? (
              dailyChallenges.map((challenge) => (
                <Card key={challenge.id} data-testid={`card-challenge-${challenge.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      {challenge.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{challenge.description}</p>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{challenge.category}</Badge>
                      <Badge className={difficultyColors[challenge.difficulty as keyof typeof difficultyColors]}>
                        {challenge.difficulty}
                      </Badge>
                      {challenge.completed && (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Completed
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress:</span>
                        <span>{challenge.progress || 0} / {challenge.targetValue}</span>
                      </div>
                      <Progress 
                        value={(challenge.progress || 0) / challenge.targetValue * 100}
                        className="h-3"
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-muted-foreground">
                        Rewards: +{challenge.xpReward} XP • +{challenge.coinReward} coins
                      </div>
                      {challenge.completed && !challenge.claimedReward && (
                        <Button size="sm" data-testid={`button-claim-challenge-${challenge.id}`}>
                          Claim Reward
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center text-muted-foreground">No challenges available</div>
            )}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <Card data-testid="card-global-leaderboard">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Global Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboardLoading ? (
                <div className="text-center text-muted-foreground">Loading leaderboard...</div>
              ) : globalLeaderboard && globalLeaderboard.length > 0 ? (
                <div className="space-y-2">
                  {globalLeaderboard.slice(0, 10).map((entry, index) => (
                    <div 
                      key={entry.userId}
                      className={`flex items-center gap-4 p-3 rounded-lg ${
                        entry.userId === profile?.userId ? 'bg-primary/10 border border-primary' : 'bg-muted/50'
                      }`}
                      data-testid={`leaderboard-entry-${entry.rank}`}
                    >
                      <div className="text-2xl font-bold w-8 text-center flex items-center justify-center">
                        {entry.rank === 1 && <Medal className="h-6 w-6 text-yellow-500" />}
                        {entry.rank === 2 && <Medal className="h-6 w-6 text-gray-400" />}
                        {entry.rank === 3 && <Medal className="h-6 w-6 text-orange-600" />}
                        {entry.rank > 3 && `#${entry.rank}`}
                      </div>
                      
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        {entry.profileImageUrl ? (
                          <img 
                            src={entry.profileImageUrl} 
                            alt={entry.displayName || entry.username}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <Users className="w-5 h-5" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-semibold" data-testid={`text-user-${entry.userId}`}>
                          {entry.displayName || entry.username}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {entry.score.toLocaleString()} XP
                        </div>
                      </div>

                      {entry.previousRank && entry.previousRank !== entry.rank && (
                        <div className="flex items-center gap-1">
                          {entry.rank < entry.previousRank ? (
                            <>
                              <ArrowUp className="w-4 h-4 text-green-500" />
                              <span className="text-green-500 text-sm">+{entry.previousRank - entry.rank}</span>
                            </>
                          ) : (
                            <>
                              <ArrowDown className="w-4 h-4 text-red-500" />
                              <span className="text-red-500 text-sm">-{entry.rank - entry.previousRank}</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground">No leaderboard data available</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rewards Tab */}
        <TabsContent value="rewards" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Spin Wheel Rewards */}
            <Card data-testid="card-wheel-rewards">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5" />
                  Spin Wheel Rewards
                </CardTitle>
              </CardHeader>
              <CardContent>
                {spinWheelConfig && spinWheelConfig.length > 0 ? (
                  <div className="space-y-2">
                    {spinWheelConfig.map((reward) => (
                      <div key={reward.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div className="text-lg flex items-center justify-center">
                            {reward.rewardType === 'xp' && <Zap className="h-5 w-5 text-yellow-500" />}
                            {reward.rewardType === 'coins' && <Coins className="h-5 w-5 text-yellow-600" />}
                            {reward.rewardType === 'multiplier' && <Sparkles className="h-5 w-5 text-purple-500" />}
                          </div>
                          <span className="font-medium" data-testid={`text-reward-${reward.id}`}>
                            {reward.displayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={rarityColors[reward.rarity as keyof typeof rarityColors]}>
                            {reward.rarity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {(parseFloat(reward.probability) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">No rewards configured</div>
                )}
              </CardContent>
            </Card>

            {/* Coin Shop (Placeholder) */}
            <Card data-testid="card-coin-shop">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Coin Shop
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Coin shop coming soon!</p>
                  <p className="text-sm">Spend your coins on helpful items and bonuses.</p>
                </div>
                {profile && (
                  <div className="text-sm">
                    Current balance: <Badge variant="outline">{profile.coinBalance} coins</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <ConfettiOverlay />
      <StreakOverlay />
    </div>
  );
}