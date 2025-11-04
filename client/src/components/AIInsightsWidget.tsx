/**
 * AI Insights Widget Component
 * Displays AI-powered insights on the dashboard with caching
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCw, Sparkles, Lightbulb } from "lucide-react";
import { getAIInsights, getMotivationalQuote } from "@/lib/aiClient";

export function AIInsightsWidget() {
  const [insights, setInsights] = useState<string[]>([]);
  const [quote, setQuote] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setIsLoading(true);
    try {
      const [insightsData, quoteData] = await Promise.all([
        getAIInsights(),
        getMotivationalQuote(),
      ]);
      setInsights(insightsData);
      setQuote(quoteData);
    } catch (error) {
      console.error("Error loading AI insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          AI Insights
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={loadInsights}
          disabled={isLoading}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Motivational Quote */}
        {quote && (
          <div className="p-3 bg-white/50 dark:bg-black/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm italic text-muted-foreground">{quote}</p>
            </div>
          </div>
        )}

        {/* AI Insights */}
        <div className="space-y-2">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-2 bg-white/50 dark:bg-black/20 rounded-lg hover:bg-white/70 dark:hover:bg-black/30 transition-colors"
            >
              <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm">{insight}</p>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.location.href = '/coach'}
        >
          <Brain className="h-4 w-4 mr-2" />
          Chat with AI Coach
        </Button>
      </CardContent>
    </Card>
  );
}

export default AIInsightsWidget;
