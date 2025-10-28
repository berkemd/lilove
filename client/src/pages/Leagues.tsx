import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame } from "lucide-react";

export default function Leagues() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="h-8 w-8 text-orange-500" />
        <h1 className="text-3xl font-bold">Leagues</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Competitive Leagues</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Join leagues and compete for promotion. Bronze to Diamond tiers available!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
