import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";

export default function Coach() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">AI Coach</h1>
          <p className="text-muted-foreground">Your personal AI-powered coach</p>
        </div>
        <Brain className="h-8 w-8 text-primary" />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Chat with Your AI Coach</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            AI Coach feature coming soon. Get personalized guidance powered by GPT-4.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
