import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

export default function Goals() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Goals</h1>
        <Button>
          <Target className="mr-2 h-4 w-4" />
          New Goal
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No goals yet. Create your first goal to get started!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
