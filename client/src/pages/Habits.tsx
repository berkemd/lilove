import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";

export default function Habits() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Habits</h1>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          New Habit
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Habits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No habits tracked yet. Start building good habits today!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
