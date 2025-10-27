import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag } from "lucide-react";

export default function Shop() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Shop</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Item Shop</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Shop for power-ups, cosmetics, and more with your earned coins!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
