import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  Target, 
  Clock,
  Brain,
  Zap,
  Calendar,
  Award,
  Activity,
  PieChart,
  Download,
  FileText,
  ChevronUp,
  ChevronDown,
  Minus,
  Users,
  Trophy,
  Flame,
  ArrowUp,
  ArrowDown,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartssPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  ComposedChart,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { format, startOfWeek, eachDayOfInterval, subDays, isToday } from "date-fns";

// LiLove color palette for charts - warm and nurturing
const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  accent: "hsl(var(--accent))",
  muted: "hsl(var(--muted))",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  purple: "#8b5cf6",
  pink: "#ec4899",
};

const GRADIENT_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
];

// Date range options
const DATE_RANGES = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "Last year" },
  { value: "all", label: "All time" },
];

interface PerformanceMetrics {
  goalCompletionRate: number;
  taskProductivity: {
    tasksPerDay: number;
    averageCompletionTime: number;
    peakHours: number[];
  };
  overallPerformanceScore: number;
  streakData: {
    currentStreak: number;
    longestStreak: number;
    consistencyScore: number;
  };
  timeTracking: {
    hoursToday: number;
    hoursThisWeek: number;
    hoursThisMonth: number;
    dailyAverage: number;
  };
}

interface ChartData {
  progressOverTime: {
    xp: { date: string; value: number }[];
    tasks: { date: string; completed: number }[];
    goals: { date: string; completed: number }[];
  };
  categoryPerformance: { category: string; value: number; percentage: number }[];
  timeDistribution: { category: string; hours: number; percentage: number }[];
  dailyActivity: { date: string; intensity: number }[];
  skillRadar: { skill: string; level: number; maxLevel: number }[];
  goalProgress: { title: string; progress: number; status: string }[];
}

interface DetailedAnalytics {
  goalAnalytics: {
    successRate: number;
    averageTimeToComplete: number;
    difficultyBreakdown: { easy: number; medium: number; hard: number };
    completionByCategory: Record<string, number>;
    predictionAccuracy: number;
  };
  taskAnalytics: {
    completionPatterns: { hour: number; count: number }[];
    peakProductivityHours: number[];
    taskTypeDistribution: Record<string, number>;
    averageTaskDuration: number;
    overdueTasks: number;
  };
  timeAnalytics: {
    focusTimePerDay: { date: string; hours: number }[];
    breakPatterns: { time: string; duration: number }[];
    optimalSessionLength: number;
    productivityByDayOfWeek: { day: string; score: number }[];
  };
  categoryAnalytics: {
    performanceByCategory: { category: string; score: number; trend: string }[];
    strengthsAndWeaknesses: { strengths: string[]; weaknesses: string[] };
    recommendedFocus: string[];
  };
  socialAnalytics: {
    teamContribution: number;
    mentorshipImpact: number;
    challengePerformance: number;
    communityEngagement: number;
    postsShared: number;
  };
}

interface AIInsights {
  dailySummary: string;
  productivityPatterns: string[];
  completionPredictions: { 
    goalId: string; 
    title: string; 
    likelihood: number; 
    predictedDate: string;
  }[];
  improvementSuggestions: string[];
  comparativeAnalysis: {
    vsLastWeek: number;
    vsLastMonth: number;
    percentile: number;
    similarUserAverage: number;
  };
  actionableRecommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    impact: string;
    reasoning: string;
  }[];
  burnoutRiskLevel: 'low' | 'medium' | 'high';
  optimalWorkSchedule: {
    bestHours: string[];
    recommendedBreaks: string[];
    focusDuration: number;
  };
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20
    }
  }
};

const chartVariants = {
  hidden: { scale: 0.9, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      duration: 0.8,
      bounce: 0.3
    }
  }
};

export default function Analytics() {
  const [dateRange, setDateRange] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Fetch data from API
  const { data: metrics, isLoading: metricsLoading } = useQuery<PerformanceMetrics>({
    queryKey: ['/api/analytics/performance', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/performance?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json();
    },
  });

  const { data: chartData, isLoading: chartsLoading } = useQuery<ChartData>({
    queryKey: ['/api/analytics/charts', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/charts?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch chart data');
      return response.json();
    },
  });

  const { data: detailed, isLoading: detailedLoading } = useQuery<DetailedAnalytics>({
    queryKey: ['/api/analytics/detailed', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/detailed?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch detailed analytics');
      return response.json();
    },
  });

  const { data: insights, isLoading: insightsLoading } = useQuery<AIInsights>({
    queryKey: ['/api/analytics/insights', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/insights?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch AI insights');
      return response.json();
    },
  });

  // Mental Health Analytics Queries
  const { data: moodTrends, isLoading: moodLoading } = useQuery<{ date: string; mood: string; score: number }[]>({
    queryKey: ['/api/analytics/mood-trends', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/mood-trends?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch mood trends');
      return response.json();
    },
  });

  const { data: activityStats, isLoading: activityLoading } = useQuery<{ coachingSessions: number; journalEntries: number; goalsCompleted: number }>({
    queryKey: ['/api/analytics/activity', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/activity?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch activity stats');
      return response.json();
    },
  });

  const { data: engagementStats, isLoading: engagementLoading } = useQuery<{ totalSessions: number; streakDays: number; goalsAchieved: number; communityPosts: number }>({
    queryKey: ['/api/analytics/engagement'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/engagement');
      if (!response.ok) throw new Error('Failed to fetch engagement stats');
      return response.json();
    },
  });

  const isLoading = metricsLoading || chartsLoading || detailedLoading || insightsLoading || moodLoading || activityLoading || engagementLoading;

  // Export functions
  const handleExportCSV = async () => {
    try {
      const response = await fetch(`/api/analytics/export/csv?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to export CSV');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Your analytics data has been exported as CSV.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export analytics data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch(`/api/analytics/export/pdf?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to generate report');
      
      const report = await response.json();
      
      // In a real implementation, you would use a library like jsPDF or html2pdf
      // For now, we'll just show the report data
      toast({
        title: "Report Generated",
        description: "Your analytics report has been generated. PDF export coming soon!",
      });
      
      console.log('Analytics Report:', report);
    } catch (error) {
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate analytics report. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-3 rounded-lg shadow-lg border">
          <p className="text-sm font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render trend icon
  const renderTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-success" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-error" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  // Generate heat map data for calendar
  const generateHeatMapData = () => {
    const today = new Date();
    const startDate = subDays(today, 90);
    const days = eachDayOfInterval({ start: startDate, end: today });
    
    return days.map(day => {
      const activity = chartData?.dailyActivity?.find(
        a => a.date === format(day, 'yyyy-MM-dd')
      );
      return {
        date: day,
        intensity: activity?.intensity || 0,
        isToday: isToday(day),
      };
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto" data-testid="page-analytics">
      {/* Header with Export Options */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3" data-testid="header-your-progress">
            <TrendingUp className="w-8 h-8 text-primary" />
            Your Progress
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your mental wellness journey and personal growth
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]" data-testid="select-date-range">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Export Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            data-testid="button-export-pdf"
          >
            <FileText className="w-4 h-4 mr-2" />
            Report
          </Button>
        </div>
      </div>

      {/* Performance Overview - Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card data-testid="metric-performance-score">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                <Zap className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{metrics?.overallPerformanceScore || 0}</div>
                  {insights?.comparativeAnalysis && (
                    <div className="flex items-center gap-1">
                      {renderTrendIcon(insights.comparativeAnalysis.vsLastWeek)}
                      <span className="text-xs text-muted-foreground">
                        {Math.abs(insights.comparativeAnalysis.vsLastWeek)}
                      </span>
                    </div>
                  )}
                </div>
                <Progress 
                  value={metrics?.overallPerformanceScore || 0} 
                  className="mt-3 h-2" 
                />
                {insights?.comparativeAnalysis && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Top {insights.comparativeAnalysis.percentile}% of users
                  </p>
                )}
              </CardContent>
            </Card>

            <Card data-testid="metric-goal-completion">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Goal Completion</CardTitle>
                <Target className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {Math.round(metrics?.goalCompletionRate || 0)}%
                  </div>
                  {detailed?.goalAnalytics && (
                    <Badge variant="outline" className="text-xs">
                      {detailed.goalAnalytics.difficultyBreakdown.easy +
                       detailed.goalAnalytics.difficultyBreakdown.medium +
                       detailed.goalAnalytics.difficultyBreakdown.hard} goals
                    </Badge>
                  )}
                </div>
                <Progress 
                  value={metrics?.goalCompletionRate || 0} 
                  className="mt-3 h-2" 
                />
              </CardContent>
            </Card>

            <Card data-testid="metric-productivity">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Task Productivity</CardTitle>
                <Activity className="h-4 w-4 text-info" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.taskProductivity.tasksPerDay.toFixed(1) || 0}
                </div>
                <p className="text-xs text-muted-foreground">tasks per day</p>
                <div className="mt-2 text-xs">
                  Avg time: {metrics?.taskProductivity.averageCompletionTime.toFixed(1) || 0}h
                </div>
              </CardContent>
            </Card>

            <Card data-testid="metric-streak">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <Flame className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">
                    {metrics?.streakData.currentStreak || 0}
                  </div>
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Longest: {metrics?.streakData.longestStreak || 0} days
                </p>
                <div className="mt-2 text-xs">
                  Consistency: {metrics?.streakData.consistencyScore || 0}%
                </div>
              </CardContent>
            </Card>

            <Card data-testid="metric-time-tracking">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Time This Week</CardTitle>
                <Clock className="h-4 w-4 text-purple" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.timeTracking.hoursThisWeek.toFixed(1) || 0}h
                </div>
                <p className="text-xs text-muted-foreground">
                  Today: {metrics?.timeTracking.hoursToday.toFixed(1) || 0}h
                </p>
                <div className="mt-2 text-xs">
                  Daily avg: {metrics?.timeTracking.dailyAverage.toFixed(1) || 0}h
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Engagement Stats Section */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-4 md:grid-cols-4"
      >
        <motion.div variants={itemVariants}>
          <Card data-testid="stat-total-sessions">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Brain className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-total-sessions">
                {engagementStats?.totalSessions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                AI coaching conversations
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card data-testid="stat-streak-days">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Streak Days</CardTitle>
              <Flame className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-streak-days">
                {engagementStats?.streakDays || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Consecutive active days
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card data-testid="stat-goals-achieved">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Goals Achieved</CardTitle>
              <Trophy className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-goals-achieved">
                {engagementStats?.goalsAchieved || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Lifetime completed goals
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card data-testid="stat-community-posts">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Community Posts</CardTitle>
              <Users className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="value-community-posts">
                {engagementStats?.communityPosts || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Contributions shared
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Mood Trends & Activity Overview Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mood Trends Section */}
        <motion.div variants={chartVariants} initial="hidden" animate="visible">
          <Card data-testid="section-mood-trends">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Mood Trends
              </CardTitle>
              <CardDescription>
                Your emotional wellness over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {moodLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={moodTrends || []}>
                    <defs>
                      <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      className="text-xs"
                      tickFormatter={(date) => format(new Date(date), 'MMM d')}
                    />
                    <YAxis domain={[0, 10]} className="text-xs" />
                    <Tooltip 
                      labelFormatter={(date) => format(new Date(date), 'MMM d, yyyy')}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background p-3 rounded-lg shadow-lg border">
                              <p className="text-sm font-medium">{format(new Date(label), 'MMM d, yyyy')}</p>
                              <p className="text-sm text-primary">
                                Mood: {(payload[0].value as number).toFixed(1)}/10
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke={CHART_COLORS.primary}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#moodGradient)"
                      name="Mood Score"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Overview Section */}
        <motion.div variants={chartVariants} initial="hidden" animate="visible">
          <Card data-testid="section-activity-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Activity Overview
              </CardTitle>
              <CardDescription>
                Your engagement breakdown for this period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={[
                    { 
                      name: 'Coaching Sessions', 
                      value: activityStats?.coachingSessions || 0,
                      fill: CHART_COLORS.primary
                    },
                    { 
                      name: 'Journal Entries', 
                      value: activityStats?.journalEntries || 0,
                      fill: CHART_COLORS.success
                    },
                    { 
                      name: 'Goals Completed', 
                      value: activityStats?.goalsCompleted || 0,
                      fill: CHART_COLORS.warning
                    }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background p-3 rounded-lg shadow-lg border">
                              <p className="text-sm font-medium">{payload[0].payload.name}</p>
                              <p className="text-sm" style={{ color: payload[0].payload.fill }}>
                                Count: {payload[0].value}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {[
                        { fill: CHART_COLORS.primary },
                        { fill: CHART_COLORS.success },
                        { fill: CHART_COLORS.warning }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Wellness Insights Section */}
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Card className="border-primary/20" data-testid="section-wellness-insights">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Wellness Insights
            </CardTitle>
            <CardDescription>
              AI-powered observations about your mental wellness journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <motion.div variants={itemVariants} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <h4 className="font-medium text-sm">Positive Trend</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your consistency has improved by 15% this week. Keep up the great momentum with your daily check-ins!
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-info" />
                  <h4 className="font-medium text-sm">Best Active Time</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  You're most engaged between 9 AM - 11 AM. Consider scheduling important tasks during this peak period.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-warning" />
                  <h4 className="font-medium text-sm">Goal Progress</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  You're on track to complete 3 goals this month. Breaking them into smaller tasks could boost your success rate.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-4 h-4 text-error" />
                  <h4 className="font-medium text-sm">Streak Builder</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Great job maintaining your streak! Consistency is key to forming lasting habits and seeing real progress.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-purple" />
                  <h4 className="font-medium text-sm">Achievement Unlocked</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  You've earned the "Mindful Monday" badge! Continue your morning reflections to unlock more achievements.
                </p>
              </motion.div>

              <motion.div variants={itemVariants} className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-success" />
                  <h4 className="font-medium text-sm">Community Impact</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your posts have received positive engagement. Sharing your journey helps inspire others in the community.
                </p>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* AI Insights Section */}
      {insights && !insightsLoading && (
        <Card className="border-primary/20" data-testid="section-ai-insights">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription>
              Personalized recommendations based on your performance patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Daily Summary */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Daily Summary
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {insights.dailySummary}
              </p>
            </div>

            {/* Productivity Patterns */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Productivity Patterns
                </h4>
                <div className="space-y-2">
                  {insights.productivityPatterns.map((pattern, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-success mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">{pattern}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Improvement Suggestions */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Improvement Areas
                </h4>
                <div className="space-y-2">
                  {insights.improvementSuggestions.map((suggestion, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <ArrowUp className="w-3 h-3 text-warning mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actionable Recommendations */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Target className="w-4 h-4" />
                Actionable Recommendations
              </h4>
              {insights.actionableRecommendations.map((rec, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border ${
                    rec.priority === 'high' 
                      ? 'border-error/50 bg-error/5'
                      : rec.priority === 'medium'
                      ? 'border-warning/50 bg-warning/5'
                      : 'border-muted'
                  }`}
                  data-testid={`recommendation-${i}`}
                >
                  <div className="flex items-start gap-3">
                    <Badge
                      variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {rec.priority}
                    </Badge>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{rec.action}</p>
                      <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                      <p className="text-xs font-medium text-primary">Impact: {rec.impact}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Goal Predictions */}
            {insights.completionPredictions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Goal Completion Predictions
                </h4>
                <div className="space-y-2">
                  {insights.completionPredictions.map((pred, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{pred.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Predicted: {new Date(pred.predictedDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={pred.likelihood} className="w-20 h-2" />
                        <span className="text-xs font-medium">{pred.likelihood}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="goals" data-testid="tab-goals">Goals</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
          <TabsTrigger value="skills" data-testid="tab-skills">Skills</TabsTrigger>
          <TabsTrigger value="social" data-testid="tab-social">Social</TabsTrigger>
          <TabsTrigger value="ai-insights" data-testid="tab-ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Progress Over Time Chart */}
            <Card data-testid="chart-progress-over-time">
              <CardHeader>
                <CardTitle className="text-lg">Progress Over Time</CardTitle>
                <CardDescription>XP, Tasks, and Goals progression</CardDescription>
              </CardHeader>
              <CardContent>
                {chartsLoading ? (
                  <Skeleton className="h-[300px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData?.progressOverTime.xp || []}>
                      <defs>
                        <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        name="XP"
                        stroke={CHART_COLORS.primary}
                        strokeWidth={2}
                        dot={{ fill: CHART_COLORS.primary, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Category Performance Chart */}
            <Card data-testid="chart-category-performance">
              <CardHeader>
                <CardTitle className="text-lg">Category Performance</CardTitle>
                <CardDescription>Performance breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                {chartsLoading ? (
                  <Skeleton className="h-[300px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData?.categoryPerformance || []}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="category" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="value" 
                        name="Completed"
                        fill={CHART_COLORS.primary}
                        radius={[8, 8, 0, 0]}
                      >
                        {chartData?.categoryPerformance?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Time Distribution Pie Chart */}
            <Card data-testid="chart-time-distribution">
              <CardHeader>
                <CardTitle className="text-lg">Time Distribution</CardTitle>
                <CardDescription>How you spend your time across categories</CardDescription>
              </CardHeader>
              <CardContent>
                {chartsLoading ? (
                  <Skeleton className="h-[300px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartssPieChart>
                      <Pie
                        data={chartData?.timeDistribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.category}: ${entry.percentage}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="hours"
                      >
                        {chartData?.timeDistribution?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartssPieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Skill Radar Chart */}
            <Card data-testid="chart-skill-radar">
              <CardHeader>
                <CardTitle className="text-lg">Skill Development</CardTitle>
                <CardDescription>Your skill levels across different areas</CardDescription>
              </CardHeader>
              <CardContent>
                {chartsLoading ? (
                  <Skeleton className="h-[300px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={chartData?.skillRadar || []}>
                      <PolarGrid className="stroke-muted" />
                      <PolarAngleAxis dataKey="skill" className="text-xs" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} className="text-xs" />
                      <Radar 
                        name="Current Level" 
                        dataKey="level" 
                        stroke={CHART_COLORS.primary}
                        fill={CHART_COLORS.primary}
                        fillOpacity={0.6}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity Heat Map */}
          <Card data-testid="chart-activity-heatmap">
            <CardHeader>
              <CardTitle className="text-lg">Activity Heat Map</CardTitle>
              <CardDescription>Daily activity intensity over the last 90 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-13 gap-1">
                {generateHeatMapData().map((day, i) => (
                  <div
                    key={i}
                    className={`aspect-square rounded-sm ${
                      day.intensity === 0
                        ? 'bg-muted'
                        : day.intensity <= 3
                        ? 'bg-success/30'
                        : day.intensity <= 6
                        ? 'bg-success/60'
                        : 'bg-success'
                    } ${day.isToday ? 'ring-2 ring-primary' : ''}`}
                    title={`${format(day.date, 'MMM dd, yyyy')}: Intensity ${day.intensity}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs text-muted-foreground">Less</span>
                <div className="flex gap-1">
                  <div className="w-3 h-3 bg-muted rounded-sm" />
                  <div className="w-3 h-3 bg-success/30 rounded-sm" />
                  <div className="w-3 h-3 bg-success/60 rounded-sm" />
                  <div className="w-3 h-3 bg-success rounded-sm" />
                </div>
                <span className="text-xs text-muted-foreground">More</span>
              </div>
            </CardContent>
          </Card>

          {/* Goal Progress Rings */}
          <Card data-testid="chart-goal-progress">
            <CardHeader>
              <CardTitle className="text-lg">Goal Progress</CardTitle>
              <CardDescription>Current progress on your active goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {chartData?.goalProgress?.map((goal, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="relative">
                      <svg className="w-16 h-16 transform -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="28"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                          strokeDasharray={`${(goal.progress / 100) * 176} 176`}
                          className="text-primary"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold">{goal.progress}%</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-2">{goal.title}</p>
                      <Badge 
                        variant={goal.status === 'completed' ? 'default' : goal.status === 'active' ? 'outline' : 'secondary'}
                        className="text-xs mt-1"
                      >
                        {goal.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Goal Analytics Summary */}
            <Card data-testid="section-goal-analytics">
              <CardHeader>
                <CardTitle className="text-lg">Goal Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                    <p className="text-2xl font-bold">
                      {Math.round(detailed?.goalAnalytics?.successRate || 0)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Completion Time</p>
                    <p className="text-2xl font-bold">
                      {detailed?.goalAnalytics?.averageTimeToComplete?.toFixed(0) || 0} days
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prediction Accuracy</p>
                    <p className="text-2xl font-bold">
                      {detailed?.goalAnalytics?.predictionAccuracy || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Goals</p>
                    <p className="text-2xl font-bold">
                      {(detailed?.goalAnalytics?.difficultyBreakdown?.easy || 0) +
                       (detailed?.goalAnalytics?.difficultyBreakdown?.medium || 0) +
                       (detailed?.goalAnalytics?.difficultyBreakdown?.hard || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Difficulty Breakdown */}
            <Card data-testid="chart-difficulty-breakdown">
              <CardHeader>
                <CardTitle className="text-lg">Difficulty Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart 
                    data={[
                      { name: 'Easy', count: detailed?.goalAnalytics?.difficultyBreakdown?.easy || 0 },
                      { name: 'Medium', count: detailed?.goalAnalytics?.difficultyBreakdown?.medium || 0 },
                      { name: 'Hard', count: detailed?.goalAnalytics?.difficultyBreakdown?.hard || 0 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" fill={CHART_COLORS.primary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Completion by Category */}
          <Card data-testid="section-category-completion">
            <CardHeader>
              <CardTitle className="text-lg">Goal Completion by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(detailed?.goalAnalytics?.completionByCategory || {}).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="font-medium">{category}</span>
                    <Badge variant="outline">{count} completed</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Task Completion Patterns */}
            <Card data-testid="chart-task-patterns">
              <CardHeader>
                <CardTitle className="text-lg">Task Completion Patterns</CardTitle>
                <CardDescription>When you're most productive during the day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={detailed?.taskAnalytics?.completionPatterns || []}>
                    <defs>
                      <linearGradient id="taskGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.info} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={CHART_COLORS.info} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="hour" 
                      className="text-xs"
                      tickFormatter={(hour) => `${hour}:00`}
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      labelFormatter={(hour) => `${hour}:00`}
                      content={<CustomTooltip />}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke={CHART_COLORS.info}
                      fillOpacity={1}
                      fill="url(#taskGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Task Analytics Summary */}
            <Card data-testid="section-task-analytics">
              <CardHeader>
                <CardTitle className="text-lg">Task Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Duration</p>
                    <p className="text-2xl font-bold">
                      {detailed?.taskAnalytics?.averageTaskDuration?.toFixed(1) || 0}h
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue Tasks</p>
                    <p className="text-2xl font-bold text-error">
                      {detailed?.taskAnalytics?.overdueTasks || 0}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Peak Productivity Hours</p>
                  <div className="flex gap-2">
                    {detailed?.taskAnalytics?.peakProductivityHours?.map((hour) => (
                      <Badge key={hour} variant="secondary">
                        {hour}:00
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Productivity by Day of Week */}
            <Card data-testid="chart-weekly-productivity">
              <CardHeader>
                <CardTitle className="text-lg">Weekly Productivity Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={detailed?.timeAnalytics?.productivityByDayOfWeek || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="score" fill={CHART_COLORS.primary} radius={[8, 8, 0, 0]} />
                    <Line type="monotone" dataKey="score" stroke={CHART_COLORS.warning} strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Focus Time Trend */}
            <Card data-testid="chart-focus-time">
              <CardHeader>
                <CardTitle className="text-lg">Focus Time Trend</CardTitle>
                <CardDescription>Daily focus hours over the past two weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={detailed?.timeAnalytics?.focusTimePerDay || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke={CHART_COLORS.success}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.success, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-6">
          <div className="grid gap-6">
            {/* Category Performance Analysis */}
            <Card data-testid="section-category-analytics">
              <CardHeader>
                <CardTitle className="text-lg">Category Performance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {detailed?.categoryAnalytics?.performanceByCategory?.map((cat) => (
                    <div key={cat.category} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{cat.category}</span>
                        <div className="flex items-center gap-2">
                          {cat.trend === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-success" />
                          ) : cat.trend === 'down' ? (
                            <TrendingDown className="w-4 h-4 text-error" />
                          ) : (
                            <Minus className="w-4 h-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-bold">{Math.round(cat.score)}%</span>
                        </div>
                      </div>
                      <Progress value={cat.score} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card data-testid="section-strengths">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-success" />
                    Your Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {detailed?.categoryAnalytics?.strengthsAndWeaknesses?.strengths?.map((strength) => (
                      <div key={strength} className="flex items-center gap-2 p-2 bg-success/10 rounded">
                        <CheckCircle className="w-4 h-4 text-success" />
                        <span className="text-sm font-medium">{strength}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="section-weaknesses">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Areas for Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {detailed?.categoryAnalytics?.strengthsAndWeaknesses?.weaknesses?.map((weakness) => (
                      <div key={weakness} className="flex items-center gap-2 p-2 bg-warning/10 rounded">
                        <XCircle className="w-4 h-4 text-warning" />
                        <span className="text-sm font-medium">{weakness}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Recommendations:</p>
                    {detailed?.categoryAnalytics?.recommendedFocus?.map((rec, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {rec}</p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="space-y-6">
          <Card data-testid="section-social-analytics">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Social & Collaboration Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Team Contribution</span>
                    <Badge variant="outline">
                      {detailed?.socialAnalytics?.teamContribution || 0}%
                    </Badge>
                  </div>
                  <Progress value={detailed?.socialAnalytics?.teamContribution || 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Mentorship Impact</span>
                    <Badge variant="outline">
                      {detailed?.socialAnalytics?.mentorshipImpact || 0}%
                    </Badge>
                  </div>
                  <Progress value={detailed?.socialAnalytics?.mentorshipImpact || 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Challenge Performance</span>
                    <Badge variant="outline">
                      {detailed?.socialAnalytics?.challengePerformance || 0}%
                    </Badge>
                  </div>
                  <Progress value={detailed?.socialAnalytics?.challengePerformance || 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Community Engagement</span>
                    <Badge variant="outline">
                      {detailed?.socialAnalytics?.communityEngagement || 0}%
                    </Badge>
                  </div>
                  <Progress value={detailed?.socialAnalytics?.communityEngagement || 0} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Posts Shared</span>
                    <Badge variant="outline">
                      {detailed?.socialAnalytics?.postsShared || 0}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Social Impact Summary */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Your Social Impact</h4>
                <p className="text-xs text-muted-foreground">
                  Your contributions have positively impacted your team's productivity. 
                  Continue engaging with challenges and mentorship opportunities to maximize your collaborative growth.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          {insightsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : insights ? (
            <>
              {/* Burnout Risk Assessment */}
              <Card 
                className={`border-2 ${
                  insights.burnoutRiskLevel === 'high' 
                    ? 'border-error/50' 
                    : insights.burnoutRiskLevel === 'medium' 
                    ? 'border-warning/50' 
                    : 'border-success/50'
                }`}
                data-testid="section-burnout-risk"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="w-5 h-5" />
                    Burnout Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Current Risk Level</span>
                      <Badge 
                        variant={
                          insights.burnoutRiskLevel === 'high' 
                            ? 'destructive' 
                            : insights.burnoutRiskLevel === 'medium' 
                            ? 'default' 
                            : 'secondary'
                        }
                        className="uppercase"
                      >
                        {insights.burnoutRiskLevel} risk
                      </Badge>
                    </div>
                    <Progress 
                      value={
                        insights.burnoutRiskLevel === 'high' ? 80 :
                        insights.burnoutRiskLevel === 'medium' ? 50 : 20
                      } 
                      className={`h-3 ${
                        insights.burnoutRiskLevel === 'high' 
                          ? '[&>div]:bg-error' 
                          : insights.burnoutRiskLevel === 'medium' 
                          ? '[&>div]:bg-warning' 
                          : '[&>div]:bg-success'
                      }`}
                    />
                    {insights.burnoutRiskLevel !== 'low' && (
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          {insights.burnoutRiskLevel === 'high' 
                            ? 'Consider taking breaks and reducing your workload to prevent burnout.'
                            : 'Monitor your stress levels and maintain work-life balance.'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Optimal Work Schedule */}
              <Card data-testid="section-optimal-schedule">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Optimal Work Schedule
                  </CardTitle>
                  <CardDescription>
                    Based on your productivity patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Best Working Hours</p>
                      <div className="space-y-1">
                        {insights.optimalWorkSchedule?.bestHours?.map((hour, i) => (
                          <Badge key={i} variant="outline" className="mr-2">
                            {hour}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Recommended Breaks</p>
                      <div className="space-y-1">
                        {insights.optimalWorkSchedule?.recommendedBreaks?.map((breakTime, i) => (
                          <p key={i} className="text-xs">{breakTime}</p>
                        ))}
                      </div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">Optimal Session Length</p>
                      <p className="text-2xl font-bold">
                        {insights.optimalWorkSchedule?.focusDuration || 90} min
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Goal Completion Predictions */}
              {insights.completionPredictions && insights.completionPredictions.length > 0 && (
                <Card data-testid="section-goal-predictions">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Goal Completion Predictions
                    </CardTitle>
                    <CardDescription>
                      ML-powered predictions for your active goals
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {insights.completionPredictions.map((prediction, i) => (
                        <div key={i} className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <p className="text-sm font-medium line-clamp-1">{prediction.title}</p>
                            <Badge variant={prediction.likelihood > 70 ? 'default' : 'secondary'}>
                              {prediction.likelihood}% likely
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Predicted completion: {prediction.predictedDate}</span>
                          </div>
                          <Progress 
                            value={prediction.likelihood} 
                            className="h-2 mt-2" 
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Comparative Analysis */}
              <Card data-testid="section-comparative-analysis">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Comparative Performance Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">vs Last Week</p>
                      <div className="flex items-center justify-center gap-1">
                        {renderTrendIcon(insights.comparativeAnalysis?.vsLastWeek || 0)}
                        <p className="text-xl font-bold">
                          {insights.comparativeAnalysis?.vsLastWeek?.toFixed(1) || 0}%
                        </p>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">vs Last Month</p>
                      <div className="flex items-center justify-center gap-1">
                        {renderTrendIcon(insights.comparativeAnalysis?.vsLastMonth || 0)}
                        <p className="text-xl font-bold">
                          {insights.comparativeAnalysis?.vsLastMonth?.toFixed(1) || 0}%
                        </p>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">User Percentile</p>
                      <p className="text-xl font-bold">
                        Top {insights.comparativeAnalysis?.percentile || 50}%
                      </p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Peer Average</p>
                      <p className="text-xl font-bold">
                        {insights.comparativeAnalysis?.similarUserAverage?.toFixed(0) || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Summary with AI Analysis */}
              <Card data-testid="section-weekly-summary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Performance Analysis
                  </CardTitle>
                  <CardDescription>
                    Intelligent insights from your activity patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Daily Summary */}
                  <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Performance Summary</h4>
                    <p className="text-sm text-muted-foreground">
                      {insights.dailySummary}
                    </p>
                  </div>

                  {/* Productivity Patterns */}
                  <div>
                    <h4 className="font-medium text-sm mb-3">Discovered Patterns</h4>
                    <div className="grid gap-2 md:grid-cols-2">
                      {insights.productivityPatterns?.map((pattern, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                          <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                          <p className="text-xs">{pattern}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Personalized Recommendations */}
                  <div>
                    <h4 className="font-medium text-sm mb-3">Personalized Recommendations</h4>
                    <div className="space-y-2">
                      {insights.actionableRecommendations?.map((rec, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border-l-4 ${
                            rec.priority === 'high' 
                              ? 'border-l-error bg-error/5'
                              : rec.priority === 'medium'
                              ? 'border-l-warning bg-warning/5'
                              : 'border-l-muted bg-muted/30'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Badge
                              variant={
                                rec.priority === 'high' 
                                  ? 'destructive' 
                                  : rec.priority === 'medium' 
                                  ? 'default' 
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {rec.priority}
                            </Badge>
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-medium">{rec.action}</p>
                              <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                              <p className="text-xs font-medium text-primary">
                                Expected Impact: {rec.impact}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Brain className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No AI insights available yet</p>
                <p className="text-sm text-muted-foreground mt-2">Complete more tasks and goals to generate insights</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}