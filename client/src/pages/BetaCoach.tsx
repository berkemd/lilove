import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

export default function BetaCoach() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold">Beta AI Coach</h1>
        <Badge variant="secondary">
          <Sparkles className="h-3 w-3 mr-1" />
          Beta
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Experimental AI Features</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Beta AI Coach features are being developed. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
