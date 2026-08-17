import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Trophy, TrendingUp, TrendingDown, Medal, Clock, Target, ArrowUp, ArrowDown, Crown, Flame, Star, Coins } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface League {
  id: string;
  name: string;
  level: number;
  minXpRequired: number;
  promotionThreshold: number;
  relegationThreshold: number;
  iconUrl: string | null;
  color: string | null;
  createdAt: string;
}

interface LeagueSeason {
  id: string;
  seasonNumber: number;
  leagueId: string;
  startDate: string;
  endDate: string;
  status: string;
  maxParticipants: number;
  currentParticipants: number;
}

interface LeagueParticipant {
  id: string;
  userId: string;
  seasonId: string;
  leagueId: string;
  weeklyXp: number;
  rank: number;
  promoted: boolean;
  relegated: boolean;
  rewardClaimed: boolean;
  user?: {
    username: string;
    displayName: string;
    avatar: string | null;
  };
}

interface CurrentLeagueData {
  league: League;
  season: LeagueSeason;
  participant: LeagueParticipant;
  leaderboard: LeagueParticipant[];
  hoursRemaining: number;
}

const leagueIcons: Record<string, typeof Trophy> = {
  Bronze: Medal,
  Silver: Medal,
  Gold: Trophy,
  Platinum: Crown,
  Diamond: Star,
  Legend: Flame,
};

const leagueColors: Record<string, string> = {
  Bronze: "text-amber-700 dark:text-amber-600",
  Silver: "text-slate-400 dark:text-slate-300",
  Gold: "text-yellow-500 dark:text-yellow-400",
  Platinum: "text-cyan-500 dark:text-cyan-400",
  Diamond: "text-blue-500 dark:text-blue-400",
  Legend: "text-purple-600 dark:text-purple-400",
};

const leagueBgColors: Record<string, string> = {
  Bronze: "bg-amber-100 dark:bg-amber-950/30",
  Silver: "bg-slate-100 dark:bg-slate-950/30",
  Gold: "bg-yellow-100 dark:bg-yellow-950/30",
  Platinum: "bg-cyan-100 dark:bg-cyan-950/30",
  Diamond: "bg-blue-100 dark:bg-blue-950/30",
  Legend: "bg-purple-100 dark:bg-purple-950/30",
};

export default function Leagues() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: currentLeague, isLoading: isLoadingCurrent } = useQuery<CurrentLeagueData>({
    queryKey: ["/api/leagues/current"],
    retry: false,
  });

  const { data: allLeagues, isLoading: isLoadingLeagues } = useQuery<League[]>({
    queryKey: ["/api/leagues"],
  });

  const { data: history } = useQuery<any[]>({
    queryKey: ["/api/leagues/history"],
  });

  const joinLeagueMutation = useMutation({
    mutationFn: async (leagueId: string) => {
      return await apiRequest("/api/leagues/join", {
        method: "POST",
        body: JSON.stringify({ leagueId }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leagues/current"] });
      toast({
        title: "Success!",
        description: "You've joined the league. Good luck!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join league",
        variant: "destructive",
      });
    },
  });

  const getZoneStatus = (rank: number, totalParticipants: number) => {
    if (rank <= 10) {
      return { zone: "promotion", color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-950/30" };
    } else if (rank > totalParticipants - 5) {
      return { zone: "relegation", color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/30" };
    } else {
      return { zone: "safe", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-950/30" };
    }
  };

  const getRewardForRank = (rank: number) => {
    if (rank === 1) {
      return { coins: 500, xp: 1000, badge: "Champion" };
    } else if (rank <= 3) {
      return { coins: 300, xp: 500, badge: "Top 3" };
    } else if (rank <= 10) {
      return { coins: 100, xp: 200, badge: "Top 10" };
    }
    return null;
  };

  if (isLoadingCurrent || isLoadingLeagues) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Trophy className="h-12 w-12 mx-auto mb-4 animate-pulse text-muted-foreground" />
          <p className="text-muted-foreground">Loading leagues...</p>
        </div>
      </div>
    );
  }

  if (!currentLeague && !isLoadingCurrent) {
    return (
      <div className="container max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-4">
          <Trophy className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-3xl font-bold">Join a League</h1>
          <p className="text-muted-foreground">
            Compete with others in weekly leagues and climb to the top!
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allLeagues?.map((league) => {
            const Icon = leagueIcons[league.name] || Trophy;
            const colorClass = leagueColors[league.name] || "text-primary";
            const bgClass = leagueBgColors[league.name] || "bg-primary/10";

            return (
              <Card key={league.id} className="hover-elevate" data-testid={`card-league-${league.name.toLowerCase()}`}>
                <CardHeader>
                  <div className={`w-16 h-16 mx-auto rounded-full ${bgClass} flex items-center justify-center mb-4`}>
                    <Icon className={`h-8 w-8 ${colorClass}`} />
                  </div>
                  <CardTitle className="text-center">{league.name}</CardTitle>
                  <CardDescription className="text-center">
                    Level {league.level}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground text-center">
                      Min XP: {league.minXpRequired}
                    </div>
                    <Button
                      onClick={() => joinLeagueMutation.mutate(league.id)}
                      disabled={joinLeagueMutation.isPending}
                      className="w-full"
                      data-testid={`button-join-${league.name.toLowerCase()}`}
                    >
                      Join League
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  if (!currentLeague) return null;

  const { league, season, participant, leaderboard, hoursRemaining } = currentLeague;
  const Icon = leagueIcons[league.name] || Trophy;
  const colorClass = leagueColors[league.name] || "text-primary";
  const bgClass = leagueBgColors[league.name] || "bg-primary/10";
  const zoneStatus = getZoneStatus(participant.rank, leaderboard.length);
  const reward = getRewardForRank(participant.rank);

  const daysRemaining = Math.floor(hoursRemaining / 24);
  const hoursOnly = hoursRemaining % 24;

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-league-title">
            <Trophy className="h-8 w-8 text-primary" />
            {league.name} League
          </h1>
          <p className="text-muted-foreground">Season {season.seasonNumber}</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2" data-testid="badge-time-remaining">
          <Clock className="h-4 w-4 mr-2" />
          {daysRemaining}d {hoursOnly}h left
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className={bgClass} data-testid="card-current-rank">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className={`h-6 w-6 ${colorClass}`} />
              Your Rank
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold" data-testid="text-user-rank">
                  #{participant.rank}
                </div>
                <div className="text-sm text-muted-foreground">
                  out of {leaderboard.length}
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Weekly XP</span>
                  <span className="font-bold" data-testid="text-user-xp">{participant.weeklyXp}</span>
                </div>
                <Progress value={(participant.weeklyXp / 1000) * 100} className="h-2" />
              </div>
              <Badge className={`w-full justify-center ${zoneStatus.bg} ${zoneStatus.color}`} data-testid={`badge-zone-${zoneStatus.zone}`}>
                {zoneStatus.zone === "promotion" && <ArrowUp className="h-4 w-4 mr-2" />}
                {zoneStatus.zone === "relegation" && <ArrowDown className="h-4 w-4 mr-2" />}
                {zoneStatus.zone === "safe" && <Target className="h-4 w-4 mr-2" />}
                {zoneStatus.zone === "promotion" && "Promotion Zone"}
                {zoneStatus.zone === "relegation" && "Relegation Zone"}
                {zoneStatus.zone === "safe" && "Safe Zone"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {reward && (
          <Card className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-950/30 dark:to-yellow-900/30" data-testid="card-potential-reward">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-600" />
                Potential Reward
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-2xl font-bold text-center">{reward.badge}</div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm">Coins:</span>
                  <span className="font-bold flex items-center gap-1" data-testid="text-reward-coins">+{reward.coins} <Coins className="h-4 w-4 text-yellow-500" /></span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">XP:</span>
                  <span className="font-bold flex items-center gap-1" data-testid="text-reward-xp">+{reward.xp} <Star className="h-4 w-4 text-yellow-400" /></span>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  Keep your rank to claim rewards!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-league-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              League Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Participants:</span>
                <span className="font-bold">{season.currentParticipants}/{season.maxParticipants}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Promotion:</span>
                <span className="font-bold text-green-600">Top 10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Relegation:</span>
                <span className="font-bold text-red-600">Bottom 5</span>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground text-center">
                Season ends {formatDistanceToNow(new Date(season.endDate), { addSuffix: true })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="progression" data-testid="tab-progression">Progression</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Standings</CardTitle>
              <CardDescription>Top {leaderboard.length} competitors this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((p, index) => {
                  const isCurrentUser = p.userId === user?.id;
                  const zoneStatus = getZoneStatus(p.rank, leaderboard.length);
                  const isTop3 = p.rank <= 3;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-md ${
                        isCurrentUser ? "bg-primary/10 border-2 border-primary" : "hover-elevate"
                      } ${zoneStatus.bg}`}
                      data-testid={`row-leaderboard-${p.rank}`}
                    >
                      <div className={`text-lg font-bold w-8 text-center flex items-center justify-center ${isTop3 ? "text-yellow-600" : ""}`}>
                        {p.rank === 1 && <Medal className="h-5 w-5 text-yellow-500" />}
                        {p.rank === 2 && <Medal className="h-5 w-5 text-gray-400" />}
                        {p.rank === 3 && <Medal className="h-5 w-5 text-orange-600" />}
                        {p.rank > 3 && `#${p.rank}`}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={p.user?.avatar || undefined} />
                        <AvatarFallback>{p.user?.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">
                          {p.user?.displayName || p.user?.username || "Anonymous"}
                          {isCurrentUser && (
                            <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.weeklyXp} XP this week
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{p.weeklyXp}</div>
                        <div className="text-xs text-muted-foreground">XP</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progression" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>League Ladder</CardTitle>
              <CardDescription>Your path to the top</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allLeagues
                  ?.slice()
                  .sort((a, b) => b.level - a.level)
                  .map((l) => {
                    const Icon = leagueIcons[l.name] || Trophy;
                    const colorClass = leagueColors[l.name] || "text-primary";
                    const bgClass = leagueBgColors[l.name] || "bg-primary/10";
                    const isCurrentLeague = l.id === league.id;

                    return (
                      <div
                        key={l.id}
                        className={`flex items-center gap-4 p-4 rounded-md ${
                          isCurrentLeague ? "bg-primary/20 border-2 border-primary" : bgClass
                        }`}
                        data-testid={`card-progression-${l.name.toLowerCase()}`}
                      >
                        <div className={`w-12 h-12 rounded-full ${bgClass} flex items-center justify-center`}>
                          <Icon className={`h-6 w-6 ${colorClass}`} />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg">{l.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Level {l.level} • Min XP: {l.minXpRequired}
                          </div>
                        </div>
                        {isCurrentLeague && (
                          <Badge variant="default" className="bg-primary">
                            Current
                          </Badge>
                        )}
                        {l.level > league.level && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Locked
                          </Badge>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>League History</CardTitle>
              <CardDescription>Your past performances</CardDescription>
            </CardHeader>
            <CardContent>
              {!history || history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No history yet. Keep competing!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((h: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-md hover-elevate"
                      data-testid={`row-history-${index}`}
                    >
                      <div>
                        <div className="font-medium">{h.league?.name} League</div>
                        <div className="text-sm text-muted-foreground">
                          Season {h.season?.seasonNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">Rank #{h.rank}</div>
                        <div className="text-sm text-muted-foreground">{h.weeklyXp} XP</div>
                        {h.promoted && (
                          <Badge variant="default" className="mt-1 bg-green-600">
                            <ArrowUp className="h-3 w-3 mr-1" />
                            Promoted
                          </Badge>
                        )}
                        {h.relegated && (
                          <Badge variant="destructive" className="mt-1">
                            <ArrowDown className="h-3 w-3 mr-1" />
                            Relegated
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
