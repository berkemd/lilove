import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
  variant?: "default" | "compact" | "wide" | "profile";
}

export function SkeletonCard({ 
  className, 
  variant = "default" 
}: SkeletonCardProps) {
  const baseClasses = "relative overflow-hidden rounded-lg bg-card border";
  
  const shimmerClasses = `
    before:absolute before:inset-0 
    before:translate-x-[-100%] 
    before:animate-[shimmer_2s_infinite] 
    before:bg-gradient-to-r 
    before:from-transparent 
    before:via-primary/10 
    before:to-transparent
  `;

  if (variant === "compact") {
    return (
      <div 
        className={cn(baseClasses, shimmerClasses, "p-4", className)}
        data-testid="skeleton-card-compact"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gradient-to-r from-muted to-muted/50 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-gradient-to-r from-muted/80 to-muted/30 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "wide") {
    return (
      <div 
        className={cn(baseClasses, shimmerClasses, "p-6", className)}
        data-testid="skeleton-card-wide"
      >
        <div className="flex gap-6">
          <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-5 w-1/3 rounded bg-gradient-to-r from-muted to-muted/50 animate-pulse" />
            <div className="h-4 w-full rounded bg-gradient-to-r from-muted/80 to-muted/30 animate-pulse" />
            <div className="h-4 w-4/5 rounded bg-gradient-to-r from-muted/60 to-muted/20 animate-pulse" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-16 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse" />
              <div className="h-6 w-20 rounded-full bg-gradient-to-r from-primary/15 to-accent/15 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "profile") {
    return (
      <div 
        className={cn(baseClasses, shimmerClasses, "p-6", className)}
        data-testid="skeleton-card-profile"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse" />
          <div className="space-y-2 text-center w-full">
            <div className="h-5 w-1/2 mx-auto rounded bg-gradient-to-r from-muted to-muted/50 animate-pulse" />
            <div className="h-3 w-1/3 mx-auto rounded bg-gradient-to-r from-muted/80 to-muted/30 animate-pulse" />
          </div>
          <div className="flex gap-4 w-full justify-center pt-2">
            <div className="text-center">
              <div className="h-6 w-12 rounded bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse mx-auto" />
              <div className="h-3 w-16 rounded bg-muted/50 animate-pulse mt-1" />
            </div>
            <div className="text-center">
              <div className="h-6 w-12 rounded bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse mx-auto" />
              <div className="h-3 w-16 rounded bg-muted/50 animate-pulse mt-1" />
            </div>
            <div className="text-center">
              <div className="h-6 w-12 rounded bg-gradient-to-r from-primary/20 to-accent/20 animate-pulse mx-auto" />
              <div className="h-3 w-16 rounded bg-muted/50 animate-pulse mt-1" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(baseClasses, shimmerClasses, "p-5", className)}
      data-testid="skeleton-card"
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-1/3 rounded bg-gradient-to-r from-muted to-muted/50 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gradient-to-r from-muted/80 to-muted/30 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-gradient-to-r from-muted/60 to-muted/20 animate-pulse" />
          <div className="h-4 w-4/6 rounded bg-gradient-to-r from-muted/40 to-muted/10 animate-pulse" />
        </div>

        <div className="flex gap-2 pt-2">
          <div className="h-8 w-20 rounded-md bg-gradient-to-r from-primary/20 to-primary/10 animate-pulse" />
          <div className="h-8 w-24 rounded-md bg-gradient-to-r from-muted to-muted/50 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ 
  count = 3, 
  variant = "default" 
}: { 
  count?: number; 
  variant?: SkeletonCardProps["variant"];
}) {
  return (
    <div className="space-y-4" data-testid="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ 
  count = 6,
  variant = "default"
}: { 
  count?: number;
  variant?: SkeletonCardProps["variant"];
}) {
  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      data-testid="skeleton-grid"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} variant={variant} />
      ))}
    </div>
  );
}
