import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Brain, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Users,
  Zap,
  Lock,
  Unlock,
  Award,
  BarChart3,
  Lightbulb,
  Flame,
  Settings,
  Wrench,
  Scale
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { trackEvent } from "@/lib/analytics";

export default function BetaCoach() {
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const { toast } = useToast();
  
  // Feature flag check
  const { isEnabled: coachEngineEnabled, isLoading: flagLoading } = useFeatureFlag('coach_engine_v1');
  
  // Fetch user goals for selection
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['/api/goals'],
    enabled: coachEngineEnabled,
  });
  
  // Fetch behavioral insights
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/coach/v1/insights', selectedGoalId],
    enabled: !!selectedGoalId && coachEngineEnabled,
  });
  
  // Run assessment mutation
  const runAssessmentMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const response = await apiRequest('/api/coach/v1/assess', {
        method: 'POST',
        body: JSON.stringify({ goalId }),
        headers: { 'Content-Type': 'application/json' }
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Assessment Complete",
        description: "Your behavioral assessment has been completed successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/coach/v1/insights'] });
      trackEvent('behavioral_assessment_completed', { goalId: selectedGoalId });
    },
    onError: (error: any) => {
      toast({
        title: "Assessment Failed",
        description: error.message || "Failed to run assessment",
        variant: "destructive"
      });
    }
  });
  
  // Complete micro-step mutation
  const completeMicroStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      return await apiRequest(`/api/coach/v1/micro-steps/${stepId}/complete`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/coach/v1/insights'] });
      toast({
        title: "Step Completed!",
        description: "Great progress on your behavioral change journey."
      });
    }
  });
  
  if (flagLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  if (!coachEngineEnabled) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <Lock className="h-4 w-4" />
          <AlertTitle>Beta Feature</AlertTitle>
          <AlertDescription>
            The Behavioral Science Coach is currently in beta. This feature is not yet available to your account.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  const assessment = (insights as any)?.assessment;
  const microSteps = (insights as any)?.microSteps || [];
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Behavioral Science Coach</h1>
            <Badge variant="secondary" data-testid="badge-beta">
              <Sparkles className="w-3 h-3 mr-1" />
              Beta
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Evidence-based insights using Fogg, SDT, and COM-B models
          </p>
        </div>
      </div>
      
      {/* Goal Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Goal for Assessment</CardTitle>
          <CardDescription>
            Choose a goal to analyze with behavioral science frameworks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedGoalId} onValueChange={setSelectedGoalId}>
              <SelectTrigger data-testid="select-goal">
                <SelectValue placeholder="Select a goal..." />
              </SelectTrigger>
              <SelectContent>
                {(goals as any[])?.map((goal: any) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.title} ({goal.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={() => selectedGoalId && runAssessmentMutation.mutate(selectedGoalId)}
              disabled={!selectedGoalId || runAssessmentMutation.isPending}
              data-testid="button-run-assessment"
            >
              {runAssessmentMutation.isPending ? 'Analyzing...' : 'Run Assessment'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Assessment Results */}
      {assessment && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="fogg">Fogg Model</TabsTrigger>
            <TabsTrigger value="sdt">SDT Profile</TabsTrigger>
            <TabsTrigger value="comb">COM-B Analysis</TabsTrigger>
            <TabsTrigger value="steps">Micro-Steps</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Readiness</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-overall-readiness">
                    {assessment.overallReadiness}%
                  </div>
                  <Progress value={assessment.overallReadiness} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {assessment.overallReadiness >= 70 ? 'High readiness' : 
                     assessment.overallReadiness >= 40 ? 'Moderate readiness' : 'Low readiness'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fogg B=MAP Score</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-fogg-score">
                    {assessment.foggScore}
                  </div>
                  <Progress value={assessment.foggScore} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Behavior = Motivation × Ability × Prompt
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">SDT Wellbeing</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-sdt-wellbeing">
                    {assessment.sdtWellbeing}%
                  </div>
                  <Progress value={assessment.sdtWellbeing} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {assessment.motivationType}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Top Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Top Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assessment.topRecommendations?.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm" data-testid={`text-recommendation-${idx}`}>{rec}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Fogg Model Tab */}
          <TabsContent value="fogg" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Motivation Score</CardTitle>
                  <CardDescription>Your drive to achieve this goal</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{assessment.motivationScore}%</div>
                  <Progress value={assessment.motivationScore} className="mb-4" />
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {assessment.motivationScore >= 70 && <><Flame className="h-4 w-4 text-orange-500" /> High motivation detected!</>}
                    {assessment.motivationScore >= 50 && assessment.motivationScore < 70 && <><Zap className="h-4 w-4 text-yellow-500" /> Moderate motivation</>}
                    {assessment.motivationScore < 50 && <><Lightbulb className="h-4 w-4 text-blue-500" /> Consider boosting your "why"</>}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Ability Score</CardTitle>
                  <CardDescription>Your capacity to perform the behavior</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{assessment.abilityScore}%</div>
                  <Progress value={assessment.abilityScore} className="mb-4" />
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    {assessment.abilityScore >= 70 && <><CheckCircle2 className="h-4 w-4 text-green-500" /> Strong capability</>}
                    {assessment.abilityScore >= 50 && assessment.abilityScore < 70 && <><Settings className="h-4 w-4 text-gray-500" /> Developing capability</>}
                    {assessment.abilityScore < 50 && <><Wrench className="h-4 w-4 text-gray-500" /> Simplify the approach</>}
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Optimal Prompt Type</CardTitle>
                <CardDescription>Best trigger for this behavior</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="text-lg py-2 px-4">
                  {assessment.promptType}
                </Badge>
                <p className="text-sm text-muted-foreground mt-4">
                  Use {assessment.promptType} prompts to maximize success probability
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* SDT Profile Tab */}
          <TabsContent value="sdt" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Unlock className="h-5 w-5" />
                    Autonomy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{assessment.sdtAutonomy}%</div>
                  <Progress value={assessment.sdtAutonomy} />
                  <p className="text-xs text-muted-foreground mt-2">
                    Sense of control and choice
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Competence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{assessment.sdtCompetence}%</div>
                  <Progress value={assessment.sdtCompetence} />
                  <p className="text-xs text-muted-foreground mt-2">
                    Feeling effective and capable
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Relatedness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">{assessment.sdtRelatedness}%</div>
                  <Progress value={assessment.sdtRelatedness} />
                  <p className="text-xs text-muted-foreground mt-2">
                    Connection with others
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Motivation Type: {assessment.motivationType}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm flex items-start gap-2">
                  {assessment.motivationType === 'intrinsic' && 
                    <><Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" /><span>You're driven by internal satisfaction and personal values. This is the most sustainable type of motivation!</span></>}
                  {assessment.motivationType === 'extrinsic' && 
                    <><Target className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" /><span>You're motivated by external rewards or social factors. Consider connecting goals to personal values for deeper engagement.</span></>}
                  {assessment.motivationType === 'amotivated' && 
                    <><AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" /><span>Low motivation detected. Start with tiny, achievable steps to rebuild momentum.</span></>}
                  {assessment.motivationType === 'balanced' && 
                    <><Scale className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" /><span>You have a mix of internal and external motivation sources. Work on strengthening intrinsic factors.</span></>}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* COM-B Analysis Tab */}
          <TabsContent value="comb" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Capability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {assessment.combCapability?.score || 0}%
                  </div>
                  <Progress value={assessment.combCapability?.score || 0} />
                  <div className="mt-4 space-y-2">
                    {assessment.combCapability?.physical?.length > 0 && (
                      <Badge variant="outline">Physical barriers: {assessment.combCapability.physical.length}</Badge>
                    )}
                    {assessment.combCapability?.psychological?.length > 0 && (
                      <Badge variant="outline">Psychological barriers: {assessment.combCapability.psychological.length}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Opportunity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {assessment.combOpportunity?.score || 0}%
                  </div>
                  <Progress value={assessment.combOpportunity?.score || 0} />
                  <div className="mt-4 space-y-2">
                    {assessment.combOpportunity?.social?.length > 0 && (
                      <Badge variant="outline">Social barriers: {assessment.combOpportunity.social.length}</Badge>
                    )}
                    {assessment.combOpportunity?.physical?.length > 0 && (
                      <Badge variant="outline">Environmental barriers: {assessment.combOpportunity.physical.length}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Motivation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">
                    {assessment.combMotivation?.score || 0}%
                  </div>
                  <Progress value={assessment.combMotivation?.score || 0} />
                  <div className="mt-4 space-y-2">
                    {assessment.combMotivation?.reflective?.length > 0 && (
                      <Badge variant="outline">Reflective barriers: {assessment.combMotivation.reflective.length}</Badge>
                    )}
                    {assessment.combMotivation?.automatic?.length > 0 && (
                      <Badge variant="outline">Automatic barriers: {assessment.combMotivation.automatic.length}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Barriers */}
            {assessment.barriers && assessment.barriers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Critical Barriers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assessment.barriers.map((barrier: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 p-3 border rounded-lg">
                      <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{barrier.description}</p>
                        <Badge variant="secondary" className="mt-1">
                          {barrier.severity} severity
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Interventions */}
            {assessment.interventions && assessment.interventions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Interventions</CardTitle>
                  <CardDescription>Evidence-based behavior change techniques</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {assessment.interventions.map((intervention: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge>{intervention.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          Targets: {intervention.comTarget}
                        </span>
                      </div>
                      <p className="text-sm">{intervention.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Micro-Steps Tab */}
          <TabsContent value="steps" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Micro-Steps (Tiny Habits)</CardTitle>
                <CardDescription>
                  Small, achievable actions based on your ability level
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {microSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No micro-steps generated yet.</p>
                ) : (
                  microSteps.map((step: any) => (
                    <div 
                      key={step.id} 
                      className={`flex items-start gap-3 p-3 border rounded-lg ${
                        step.completed ? 'bg-muted/50' : ''
                      }`}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-0.5"
                        onClick={() => !step.completed && completeMicroStepMutation.mutate(step.id)}
                        disabled={step.completed || completeMicroStepMutation.isPending}
                        data-testid={`button-complete-step-${step.id}`}
                      >
                        <CheckCircle2 className={`h-5 w-5 ${step.completed ? 'text-primary' : ''}`} />
                      </Button>
                      <div className="flex-1">
                        <p className={`text-sm ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {step.step}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {step.difficulty}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {step.estimatedTime} min
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {step.trigger}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {/* Empty State */}
      {!assessment && selectedGoalId && (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Assessment Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Run a behavioral assessment to get evidence-based insights
            </p>
            <Button 
              onClick={() => runAssessmentMutation.mutate(selectedGoalId)}
              disabled={runAssessmentMutation.isPending}
            >
              Run Assessment Now
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Disclaimer */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Scientific Disclaimer</AlertTitle>
        <AlertDescription className="text-xs">
          This tool uses evidence-based behavioral science frameworks (Fogg Behavior Model, Self-Determination Theory, and COM-B) 
          to provide insights. These are educational tools, not medical or psychological advice. For professional support, 
          please consult qualified practitioners.
        </AlertDescription>
      </Alert>
    </div>
  );
}
