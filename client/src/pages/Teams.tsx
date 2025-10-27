import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

export default function Teams() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Teams</h1>
        <Button>
          <Users className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No teams yet. Create or join a team to collaborate!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
