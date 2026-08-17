import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  BarChart3, 
  Lock,
  AlertCircle,
  Sparkles,
  Target,
  Users,
  Zap,
  Award
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useAuth } from "@/hooks/useAuth";

export default function Insights() {
  const { user } = useAuth();
  const userId = user?.id;
  
  // Feature flag check
  const { isEnabled: insightsEnabled, isLoading: flagLoading } = useFeatureFlag('insights_v1');
  
  // Fetch weekly report
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ['/api/reports/weekly', userId],
    enabled: !!userId && insightsEnabled,
  });
  
  if (flagLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  if (!insightsEnabled) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Beta Feature</AlertTitle>
          <AlertDescription>
            Weekly Behavioral Insights are currently in beta. This feature is not yet available to your account.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (reportLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }
  
  const weeklyReport = (report as any)?.report;
  
  if (!weeklyReport) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Data Yet</AlertTitle>
          <AlertDescription>
            Complete a behavioral assessment to see your weekly insights.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Weekly Insights</h1>
            <Badge variant="secondary" data-testid="badge-beta">
              <Sparkles className="w-3 h-3 mr-1" />
              Beta
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Your behavioral science progress and trends
          </p>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Behavior Change Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-behavior-change-score">
              {weeklyReport.behaviorChangeScore || 0}%
            </div>
            <Progress value={weeklyReport.behaviorChangeScore || 0} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {weeklyReport.behaviorChangeScore >= 70 ? 'Excellent progress!' :
               weeklyReport.behaviorChangeScore >= 50 ? 'Good momentum' :
               'Building foundations'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Optimal Trigger Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {weeklyReport.triggerHeatmap?.mostEffective || 'Morning'}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {weeklyReport.triggerHeatmap?.successRate || 80}% success rate at this time
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Barriers</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {weeklyReport.barrierAnalysis?.activeBarriers || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {weeklyReport.barrierAnalysis?.resolvedThisWeek || 0} resolved this week
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* SDT Trends */}
      {weeklyReport.sdtTrends && (
        <Card>
          <CardHeader>
            <CardTitle>Self-Determination Trends</CardTitle>
            <CardDescription>Your psychological needs over time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Autonomy</span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(weeklyReport.sdtTrends.autonomyTrend)}
                  <span className="text-sm">{weeklyReport.sdtTrends.autonomy || 0}%</span>
                </div>
              </div>
              <Progress value={weeklyReport.sdtTrends.autonomy || 0} />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Competence</span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(weeklyReport.sdtTrends.competenceTrend)}
                  <span className="text-sm">{weeklyReport.sdtTrends.competence || 0}%</span>
                </div>
              </div>
              <Progress value={weeklyReport.sdtTrends.competence || 0} />
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Relatedness</span>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(weeklyReport.sdtTrends.relatednessTrend)}
                  <span className="text-sm">{weeklyReport.sdtTrends.relatedness || 0}%</span>
                </div>
              </div>
              <Progress value={weeklyReport.sdtTrends.relatedness || 0} />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Trigger Heatmap */}
      {weeklyReport.triggerHeatmap && (
        <Card>
          <CardHeader>
            <CardTitle>Trigger Effectiveness Heatmap</CardTitle>
            <CardDescription>When prompts work best for you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {['morning', 'afternoon', 'evening', 'night'].map((time) => {
                const data = weeklyReport.triggerHeatmap?.byTime?.[time] || { success: 0, total: 1 };
                const rate = Math.round((data.success / data.total) * 100);
                const isOptimal = time === weeklyReport.triggerHeatmap?.mostEffective;
                
                return (
                  <div key={time} className={`p-3 border rounded-lg ${isOptimal ? 'border-primary' : ''}`}>
                    <div className="text-xs font-medium capitalize mb-2">{time}</div>
                    <div className="text-2xl font-bold">{rate}%</div>
                    <Progress value={rate} className="mt-2" />
                    {isOptimal && (
                      <Badge variant="outline" className="mt-2 text-xs">Optimal</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Barrier Analysis */}
      {weeklyReport.barrierAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Barrier Root Cause Analysis</CardTitle>
            <CardDescription>COM-B breakdown of obstacles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Capability</span>
                  <Badge variant="outline">
                    {weeklyReport.barrierAnalysis.capabilityBarriers || 0}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Physical or psychological limitations
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Opportunity</span>
                  <Badge variant="outline">
                    {weeklyReport.barrierAnalysis.opportunityBarriers || 0}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Social or environmental factors
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Motivation</span>
                  <Badge variant="outline">
                    {weeklyReport.barrierAnalysis.motivationBarriers || 0}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Reflective or automatic processes
                </p>
              </div>
            </div>
            
            {weeklyReport.barrierAnalysis.topBarrier && (
              <div className="mt-4 p-3 border rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-1">Primary Barrier This Week:</p>
                <p className="text-sm">{weeklyReport.barrierAnalysis.topBarrier}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Recommendations */}
      {weeklyReport.recommendations && weeklyReport.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Weekly Recommendations</CardTitle>
            <CardDescription>Evidence-based actions for next week</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {weeklyReport.recommendations.map((rec: string, idx: number) => (
              <div key={idx} className="flex items-start gap-2 p-3 border rounded-lg">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm" data-testid={`text-recommendation-${idx}`}>{rec}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Disclaimer */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Educational Tool</AlertTitle>
        <AlertDescription className="text-xs">
          These insights are based on behavioral science research and your activity patterns. 
          They are educational in nature and not a substitute for professional advice.
        </AlertDescription>
      </Alert>
    </div>
  );
}
