import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/lib/analytics';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

import {
  Brain,
  Sparkles,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Calendar,
  RefreshCw,
  Lightbulb,
  Heart,
  Activity,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface FoggAnalysis {
  motivation: { score: number; factors: string[] };
  ability: { score: number; blockers: string[] };
  prompt: { timing: string; message: string };
  behaviorProbability: number;
}

interface ReplanningRecommendation {
  id: string;
  type: 'reschedule' | 'simplify' | 'break_down' | 'motivate' | 'pause';
  priority: 'high' | 'medium' | 'low';
  targetId: string;
  targetType: 'goal' | 'task' | 'habit';
  suggestion: string;
  reasoning: string;
  foggAnalysis: FoggAnalysis;
  proposedChanges?: Record<string, unknown>;
  createdAt: string;
  status: string;
}

interface GoalAnalysis {
  goalId: string;
  goalTitle: string;
  healthScore: number;
  bottlenecks: string[];
  foggAnalysis: FoggAnalysis;
  recommendations: ReplanningRecommendation[];
  predictedCompletion: {
    probability: number;
    estimatedDate: string | null;
    confidence: number;
  };
}

interface DailySummary {
  date: string;
  overallProgress: number;
  motivationScore: number;
  abilityScore: number;
  completedTasks: number;
  pendingTasks: number;
  activeGoals: number;
  currentStreak: number;
  tips: string[];
  nudge: string;
  priorityActions: string[];
}

interface AIGoalAssistantProps {
  goalId?: string;
  isOpen: boolean;
  onClose: () => void;
  mode: 'goal' | 'dashboard';
}

const PRIORITY_COLORS = {
  high: 'bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-800',
  medium: 'bg-yellow-500/10 text-yellow-600 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-800',
  low: 'bg-green-500/10 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-800',
};

const TYPE_ICONS = {
  reschedule: Calendar,
  simplify: Target,
  break_down: RefreshCw,
  motivate: Heart,
  pause: Clock,
};

function HealthScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-green-500';
    if (s >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getStrokeColor = (s: number) => {
    if (s >= 70) return '#22c55e';
    if (s >= 40) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="relative inline-flex items-center justify-center" data-testid="health-score-ring">
      <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          className="text-muted stroke-current"
          strokeWidth="8"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
        />
        <circle
          stroke={getStrokeColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          fill="transparent"
          r="45"
          cx="50"
          cy="50"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={cn("text-2xl font-bold", getScoreColor(score))} data-testid="text-health-score">
          {score}
        </span>
        <span className="text-xs text-muted-foreground">Health</span>
      </div>
    </div>
  );
}

function CompletionProbabilityMeter({ 
  probability, 
  confidence,
  estimatedDate 
}: { 
  probability: number; 
  confidence: number;
  estimatedDate: string | null;
}) {
  const getColor = (p: number) => {
    if (p >= 70) return 'bg-green-500';
    if (p >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="border-accent/20" data-testid="completion-probability-meter">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">Completion Probability</span>
          </div>
          <span className="text-lg font-bold" data-testid="text-probability">{Math.round(probability)}%</span>
        </div>
        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", getColor(probability))}
            initial={{ width: 0 }}
            animate={{ width: `${probability}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Confidence: {Math.round(confidence)}%</span>
          {estimatedDate && (
            <span data-testid="text-estimated-date">ETA: {new Date(estimatedDate).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FoggModelDisplay({ analysis }: { analysis: FoggAnalysis }) {
  const getMotivationEmoji = (score: number) => {
    if (score >= 80) return '🔥';
    if (score >= 60) return '💪';
    if (score >= 40) return '😊';
    if (score >= 20) return '😐';
    return '😴';
  };

  const getAbilityIndicator = (score: number) => {
    if (score >= 80) return { label: 'Very Easy', color: 'text-green-500' };
    if (score >= 60) return { label: 'Manageable', color: 'text-green-400' };
    if (score >= 40) return { label: 'Moderate', color: 'text-yellow-500' };
    if (score >= 20) return { label: 'Challenging', color: 'text-orange-500' };
    return { label: 'Difficult', color: 'text-red-500' };
  };

  const abilityInfo = getAbilityIndicator(analysis.ability.score);

  return (
    <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/50 dark:border-amber-800/50" data-testid="fogg-model-display">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Behavior Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-background/50 rounded-lg" data-testid="fogg-motivation">
            <div className="text-2xl mb-1">{getMotivationEmoji(analysis.motivation.score)}</div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{analysis.motivation.score}</div>
            <div className="text-xs text-muted-foreground">Motivation</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-lg" data-testid="fogg-ability">
            <Activity className={cn("h-6 w-6 mx-auto mb-1", abilityInfo.color)} />
            <div className={cn("text-sm font-medium", abilityInfo.color)}>{abilityInfo.label}</div>
            <div className="text-xs text-muted-foreground">Ability</div>
          </div>
          <div className="text-center p-3 bg-background/50 rounded-lg" data-testid="fogg-prompt">
            <Clock className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">{analysis.prompt.timing.split(' - ')[0]}</div>
            <div className="text-xs text-muted-foreground">Best Time</div>
          </div>
        </div>

        <div className="p-3 bg-background/50 rounded-lg border border-amber-200/30 dark:border-amber-800/30">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground" data-testid="text-prompt-message">
              {analysis.prompt.message}
            </p>
          </div>
        </div>

        {analysis.motivation.factors.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Motivation Insights:</span>
            <div className="flex flex-wrap gap-1">
              {analysis.motivation.factors.slice(0, 3).map((factor, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {factor}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecommendationCard({ 
  recommendation, 
  onApply, 
  onDismiss,
  isApplying,
  isDismissing,
}: { 
  recommendation: ReplanningRecommendation;
  onApply: () => void;
  onDismiss: () => void;
  isApplying: boolean;
  isDismissing: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const TypeIcon = TYPE_ICONS[recommendation.type] || Target;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      data-testid={`recommendation-card-${recommendation.id}`}
    >
      <Card className="hover-elevate">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-accent/10">
                <TypeIcon className="h-4 w-4 text-accent" />
              </div>
              <div>
                <Badge 
                  variant="outline" 
                  className={cn("text-xs", PRIORITY_COLORS[recommendation.priority])}
                  data-testid={`badge-priority-${recommendation.id}`}
                >
                  {recommendation.priority}
                </Badge>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs capitalize">
              {recommendation.type.replace('_', ' ')}
            </Badge>
          </div>

          <p className="text-sm font-medium" data-testid={`text-suggestion-${recommendation.id}`}>
            {recommendation.suggestion}
          </p>

          <p className="text-xs text-muted-foreground" data-testid={`text-reasoning-${recommendation.id}`}>
            {recommendation.reasoning}
          </p>

          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              onClick={onApply}
              disabled={isApplying || isDismissing}
              className="flex-1"
              data-testid={`button-apply-${recommendation.id}`}
            >
              {isApplying ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              )}
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDismiss}
              disabled={isApplying || isDismissing}
              data-testid={`button-dismiss-${recommendation.id}`}
            >
              {isDismissing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <XCircle className="h-3 w-3" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DailySummaryView({ summary }: { summary: DailySummary }) {
  return (
    <div className="space-y-4" data-testid="daily-summary-view">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{summary.completedTasks}</div>
            <div className="text-xs text-muted-foreground">Tasks Done</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-500">{summary.pendingTasks}</div>
            <div className="text-xs text-muted-foreground">Pending</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-accent">{summary.activeGoals}</div>
            <div className="text-xs text-muted-foreground">Active Goals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-500">{summary.currentStreak}</div>
            <div className="text-xs text-muted-foreground">Day Streak</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200/50 dark:border-amber-800/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-1">Daily Nudge</h4>
              <p className="text-sm text-amber-700 dark:text-amber-400" data-testid="text-daily-nudge">
                {summary.nudge}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {summary.tips.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-accent" />
              Today's Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.tips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span data-testid={`text-tip-${idx}`}>{tip}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {summary.priorityActions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Priority Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.priorityActions.map((action, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                <span data-testid={`text-priority-action-${idx}`}>{action}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4" data-testid="loading-skeleton">
      <div className="flex items-center gap-4">
        <Skeleton className="w-28 h-28 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-32 w-full" />
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export function AIGoalAssistant({ goalId, isOpen, onClose, mode }: AIGoalAssistantProps) {
  const { toast } = useToast();
  const shouldReduceMotion = useReducedMotion();
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const goalAnalysisQuery = useQuery<GoalAnalysis>({
    queryKey: ['/api/ai-replanning/analyze', goalId],
    enabled: isOpen && mode === 'goal' && !!goalId,
  });

  const dailySummaryQuery = useQuery<DailySummary>({
    queryKey: ['/api/ai-replanning/daily-summary'],
    enabled: isOpen && mode === 'dashboard',
  });

  const applyMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      const response = await apiRequest(`/api/ai-replanning/apply/${recommendationId}`, {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: (_, recommendationId) => {
      toast({
        title: 'Recommendation Applied',
        description: 'Your goal has been updated based on the recommendation.',
      });
      trackEvent('ai_recommendation_applied', { recommendationId });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-replanning/analyze', goalId] });
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      setApplyingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Apply',
        description: error.message || 'Could not apply the recommendation. Please try again.',
        variant: 'destructive',
      });
      setApplyingId(null);
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (recommendationId: string) => {
      const response = await apiRequest(`/api/ai-replanning/dismiss/${recommendationId}`, {
        method: 'POST',
      });
      return response.json();
    },
    onSuccess: (_, recommendationId) => {
      toast({
        title: 'Recommendation Dismissed',
        description: 'The recommendation has been dismissed.',
      });
      trackEvent('ai_recommendation_dismissed', { recommendationId });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-replanning/analyze', goalId] });
      setDismissingId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to Dismiss',
        description: error.message || 'Could not dismiss the recommendation. Please try again.',
        variant: 'destructive',
      });
      setDismissingId(null);
    },
  });

  const handleApply = (recommendationId: string) => {
    setApplyingId(recommendationId);
    applyMutation.mutate(recommendationId);
  };

  const handleDismiss = (recommendationId: string) => {
    setDismissingId(recommendationId);
    dismissMutation.mutate(recommendationId);
  };

  const isLoading = mode === 'goal' ? goalAnalysisQuery.isLoading : dailySummaryQuery.isLoading;
  const analysis = goalAnalysisQuery.data;
  const summary = dailySummaryQuery.data;

  const groupedRecommendations = analysis?.recommendations.reduce((acc, rec) => {
    if (!acc[rec.type]) acc[rec.type] = [];
    acc[rec.type].push(rec);
    return acc;
  }, {} as Record<string, ReplanningRecommendation[]>);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="flex items-center gap-2">
                AI Goal Assistant
                <Sparkles className="h-4 w-4 text-amber-500" />
              </DialogTitle>
              <DialogDescription>
                {mode === 'goal' 
                  ? 'AI-powered insights and recommendations for your goal'
                  : 'Your personalized daily summary and action items'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
          {isLoading ? (
            <LoadingSkeleton />
          ) : mode === 'goal' && analysis ? (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4 pb-4"
            >
              <div className="flex items-center gap-4">
                <HealthScoreRing score={analysis.healthScore} />
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold" data-testid="text-goal-title">{analysis.goalTitle}</h3>
                  <CompletionProbabilityMeter
                    probability={analysis.predictedCompletion.probability}
                    confidence={analysis.predictedCompletion.confidence}
                    estimatedDate={analysis.predictedCompletion.estimatedDate}
                  />
                </div>
              </div>

              <FoggModelDisplay analysis={analysis.foggAnalysis} />

              {analysis.bottlenecks.length > 0 && (
                <Card className="border-yellow-200 dark:border-yellow-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Bottlenecks Identified
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {analysis.bottlenecks.map((bottleneck, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-yellow-500 mt-1">•</span>
                          <span data-testid={`text-bottleneck-${idx}`}>{bottleneck}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {groupedRecommendations && Object.keys(groupedRecommendations).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-accent" />
                      AI Recommendations
                    </CardTitle>
                    <CardDescription>
                      Personalized suggestions to improve your goal progress
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="multiple" className="w-full" defaultValue={Object.keys(groupedRecommendations)}>
                      {Object.entries(groupedRecommendations).map(([type, recs]) => {
                        const TypeIcon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] || Target;
                        return (
                          <AccordionItem key={type} value={type}>
                            <AccordionTrigger className="text-sm capitalize" data-testid={`accordion-trigger-${type}`}>
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4 text-accent" />
                                {type.replace('_', ' ')} ({recs.length})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <AnimatePresence mode="popLayout">
                                <div className="space-y-3">
                                  {recs.map((rec) => (
                                    <RecommendationCard
                                      key={rec.id}
                                      recommendation={rec}
                                      onApply={() => handleApply(rec.id)}
                                      onDismiss={() => handleDismiss(rec.id)}
                                      isApplying={applyingId === rec.id}
                                      isDismissing={dismissingId === rec.id}
                                    />
                                  ))}
                                </div>
                              </AnimatePresence>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ) : mode === 'dashboard' && summary ? (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="pb-4"
            >
              <DailySummaryView summary={summary} />
            </motion.div>
          ) : (
            <div className="text-center py-8 text-muted-foreground" data-testid="no-data-state">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No analysis data available</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
