import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface LiLoveCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
  glowColor?: "primary" | "accent" | "secondary";
  disableHover?: boolean;
}

const LiLoveCard = React.forwardRef<HTMLDivElement, LiLoveCardProps>(
  ({ className, children, glowColor = "primary", disableHover = false, ...props }, ref) => {
    const glowColors = {
      primary: "hsl(var(--primary) / 0.15)",
      accent: "hsl(var(--accent) / 0.15)",
      secondary: "hsl(var(--secondary) / 0.15)",
    };

    const borderGradients = {
      primary: "linear-gradient(135deg, hsl(var(--primary)), hsl(340, 80%, 55%), hsl(var(--accent)))",
      accent: "linear-gradient(135deg, hsl(var(--accent)), hsl(22, 92%, 70%), hsl(var(--primary)))",
      secondary: "linear-gradient(135deg, hsl(var(--secondary)), hsl(142, 73%, 45%), hsl(var(--primary)))",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "lilove-card relative bg-card text-card-foreground shadow-sm",
          "overflow-visible",
          className
        )}
        style={{
          borderRadius: "24px 8px 24px 8px",
        }}
        initial={false}
        whileHover={disableHover ? undefined : {
          y: -4,
          transition: { type: "spring", stiffness: 400, damping: 25 }
        }}
        {...props}
      >
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none"
          style={{
            borderRadius: "inherit",
            background: borderGradients[glowColor],
            padding: "2px",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
        
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none"
          style={{
            borderRadius: "inherit",
            boxShadow: `inset 0 0 30px ${glowColors[glowColor]}, 0 0 20px ${glowColors[glowColor]}`,
          }}
        />
        
        <div
          className="relative z-10 p-6 bg-card h-full"
          style={{
            borderRadius: "inherit",
            border: "1px solid hsl(var(--card-border))",
          }}
        >
          {children}
        </div>

        <style>{`
          .lilove-card:hover > div:first-child {
            opacity: 1;
          }
          .lilove-card:hover > div:nth-child(2) {
            opacity: 0.6;
          }
        `}</style>
      </motion.div>
    );
  }
);

LiLoveCard.displayName = "LiLoveCard";

const LiLoveCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
LiLoveCardHeader.displayName = "LiLoveCardHeader";

const LiLoveCardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-xl font-semibold leading-none tracking-tight brand-heading",
      className
    )}
    {...props}
  />
));
LiLoveCardTitle.displayName = "LiLoveCardTitle";

const LiLoveCardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
LiLoveCardDescription.displayName = "LiLoveCardDescription";

const LiLoveCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
LiLoveCardContent.displayName = "LiLoveCardContent";

const LiLoveCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4 gap-2", className)}
    {...props}
  />
));
LiLoveCardFooter.displayName = "LiLoveCardFooter";

export {
  LiLoveCard,
  LiLoveCardHeader,
  LiLoveCardTitle,
  LiLoveCardDescription,
  LiLoveCardContent,
  LiLoveCardFooter,
};
