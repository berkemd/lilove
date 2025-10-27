import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2 } from "lucide-react";

export default function Gamification() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Gamepad2 className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Gamification Hub</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Gaming Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Track your XP, level, achievements, and more gaming elements!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
