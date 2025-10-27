import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

export default function NotificationCenter() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Notifications</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No new notifications. You're all caught up!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
