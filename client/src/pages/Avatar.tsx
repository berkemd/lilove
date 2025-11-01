import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCircle } from "lucide-react";

export default function Avatar() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <UserCircle className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Avatar Customization</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Customize Your Avatar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Avatar customization feature coming soon. Express yourself with unique avatars!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
