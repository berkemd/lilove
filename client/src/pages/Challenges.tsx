import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords } from "lucide-react";

export default function Challenges() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Challenges</h1>
        <Button>
          <Swords className="mr-2 h-4 w-4" />
          New Challenge
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Challenges</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No active challenges. Join or create one to compete!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
