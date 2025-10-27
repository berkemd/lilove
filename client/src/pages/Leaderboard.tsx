import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal } from "lucide-react";

export default function Leaderboard() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Medal className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Leaderboard</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Global Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Compete with others and climb the leaderboard!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
