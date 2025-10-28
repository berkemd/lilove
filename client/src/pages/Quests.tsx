import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

export default function Quests() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Map className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Quests</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active Quests</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Story-driven quests coming soon. Embark on epic journeys!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
