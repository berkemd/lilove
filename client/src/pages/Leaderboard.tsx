import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Globe,
  Target,
  Briefcase,
  Heart,
  Code,
  Timer,
  Star,
  Flame,
  Award
} from "lucide-react";

const CATEGORIES = [
  { value: 'global', label: 'Global', icon: Globe },
  { value: 'tech', label: 'Tech', icon: Code },
  { value: 'fitness', label: 'Fitness', icon: Heart },
  { value: 'business', label: 'Business', icon: Briefcase },
  { value: 'creative', label: 'Creative', icon: Target },
];

const TIMEFRAMES = [
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'all_time', label: 'All Time' },
];

function getRankIcon(rank: number) {
  switch (rank) {
    case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
    case 2: return <Medal className="w-6 h-6 text-gray-400" />;
    case 3: return <Medal className="w-6 h-6 text-orange-600" />;
    default: return null;
  }
}

function getRankBadge(rank: number) {
  switch (rank) {
    case 1: return { variant: 'default' as const, className: 'bg-gradient-to-r from-yellow-500 to-amber-500' };
    case 2: return { variant: 'secondary' as const, className: 'bg-gradient-to-r from-gray-400 to-gray-500' };
    case 3: return { variant: 'secondary' as const, className: 'bg-gradient-to-r from-orange-500 to-orange-600' };
    default: return { variant: 'outline' as const, className: '' };
  }
}

function getRankChange(current: number | null, previous: number | null) {
  if (!current || !previous) return { icon: null, text: 'NEW', color: 'text-green-500' };
  const diff = previous - current;
  if (diff > 0) return { icon: <TrendingUp className="w-4 h-4" />, text: `+${diff}`, color: 'text-green-500' };
  if (diff < 0) return { icon: <TrendingDown className="w-4 h-4" />, text: `${diff}`, color: 'text-red-500' };
  return { icon: <Minus className="w-4 h-4" />, text: '—', color: 'text-muted-foreground' };
}

interface LeaderboardEntry {
  rank: number | null;
  userId: string;
  score: number;
  previousRank: number | null;
  username: string | null;
  displayName: string | null;
  profileImageUrl: string | null;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [category, setCategory] = useState('global');
  const [timeframe, setTimeframe] = useState('weekly');
  const [viewMode, setViewMode] = useState<'global' | 'friends'>('global');

  // Fetch leaderboard data
  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ['/api/gamification/leaderboard', viewMode, category, timeframe],
    queryFn: async () => {
      const endpoint = viewMode === 'friends' 
        ? '/api/gamification/leaderboard/friends'
        : `/api/gamification/leaderboard?category=${category}&timeframe=${timeframe}`;
      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    },
    enabled: !!user,
  });

  // Find current user's position
  const userPosition = leaderboard?.find(entry => entry.userId === user?.id);
  const userRank = userPosition?.rank || 0;

  return (
    <div className="p-6 space-y-8" data-testid="page-leaderboard">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            Leaderboard
          </h1>
          <p className="text-muted-foreground">
            Compete with others and climb to the top!
          </p>
        </div>

        {/* Your Position Card */}
        {userPosition && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-16 w-16 border-2 border-primary">
                        <AvatarImage src={userPosition.profileImageUrl || undefined} />
                        <AvatarFallback>{userPosition.displayName?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      {userRank <= 3 && (
                        <div className="absolute -top-2 -right-2">
                          {getRankIcon(userRank)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Your Position</p>
                      <p className="text-2xl font-bold">#{userRank}</p>
                      <p className="text-sm font-medium">{userPosition.displayName || userPosition.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{userPosition.score.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">XP Points</p>
                    {userPosition.previousRank && (
                      <div className={`flex items-center justify-end gap-1 mt-1 ${getRankChange(userPosition.rank, userPosition.previousRank).color}`}>
                        {getRankChange(userPosition.rank, userPosition.previousRank).icon}
                        <span className="text-sm font-medium">
                          {getRankChange(userPosition.rank, userPosition.previousRank).text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'global' | 'friends')} className="w-auto">
          <TabsList data-testid="leaderboard-view-tabs">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Global
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Friends
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {viewMode === 'global' && (
          <>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]" data-testid="category-select">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <cat.icon className="w-4 h-4" />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-[180px]" data-testid="timeframe-select">
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((tf) => (
                  <SelectItem key={tf.value} value={tf.value}>
                    {tf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Top Players</span>
            <Badge variant="secondary">
              {leaderboard?.length || 0} Players
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading leaderboard...
            </div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No players on the leaderboard yet. Start playing to claim the top spot!
            </div>
          ) : (
            <div className="divide-y">
              <AnimatePresence>
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.userId === user?.id;
                  const rankBadgeStyle = getRankBadge(entry.rank || 0);
                  const rankChange = getRankChange(entry.rank, entry.previousRank);
                  
                  return (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                        isCurrentUser ? 'bg-primary/5' : ''
                      }`}
                      data-testid={`leaderboard-entry-${entry.userId}`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rank */}
                        <div className="w-12 text-center">
                          {entry.rank && entry.rank <= 3 ? (
                            getRankIcon(entry.rank)
                          ) : (
                            <Badge {...rankBadgeStyle} className={`min-w-[2rem] ${rankBadgeStyle.className}`}>
                              {entry.rank || '—'}
                            </Badge>
                          )}
                        </div>

                        {/* User Info */}
                        <div className="flex items-center gap-3">
                          <Avatar className={`h-10 w-10 ${isCurrentUser ? 'ring-2 ring-primary' : ''}`}>
                            <AvatarImage src={entry.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {entry.displayName?.[0] || entry.username?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className={`font-medium ${isCurrentUser ? 'text-primary' : ''}`}>
                              {entry.displayName || entry.username || 'Anonymous'}
                              {isCurrentUser && <span className="ml-2 text-xs">(You)</span>}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                Level {Math.floor(entry.score / 1000) + 1}
                              </Badge>
                              {entry.score > 10000 && (
                                <Flame className="w-4 h-4 text-orange-500" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Score & Change */}
                      <div className="flex items-center gap-6">
                        <div className={`flex items-center gap-1 ${rankChange.color}`}>
                          {rankChange.icon}
                          <span className="text-sm font-medium">
                            {rankChange.text}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">{entry.score.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">XP</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Pro Tips to Climb the Ranks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <Flame className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium">Maintain Daily Streaks</p>
                <p className="text-sm text-muted-foreground">
                  Login daily to earn streak bonuses and climb faster
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Trophy className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Complete Challenges</p>
                <p className="text-sm text-muted-foreground">
                  Daily and weekly challenges offer huge XP rewards
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-medium">Unlock Achievements</p>
                <p className="text-sm text-muted-foreground">
                  Each achievement unlocked grants bonus XP
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Timer className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Stay Consistent</p>
                <p className="text-sm text-muted-foreground">
                  Regular activity earns more XP than sporadic bursts
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}