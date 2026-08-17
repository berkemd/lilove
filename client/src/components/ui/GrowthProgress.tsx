import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface GrowthProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLeaves?: boolean;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
}

const GrowthProgress = React.forwardRef<HTMLDivElement, GrowthProgressProps>(
  ({ value, max = 100, className, showLeaves = true, showPercentage = false, size = "md" }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    const getProgressColor = (percent: number) => {
      if (percent < 25) return "hsl(var(--destructive))";
      if (percent < 50) return "hsl(var(--accent))";
      if (percent < 75) return "hsl(var(--chart-4))";
      return "hsl(var(--secondary))";
    };

    const getGradient = (percent: number) => {
      if (percent < 25) return "linear-gradient(90deg, hsl(var(--destructive)), hsl(var(--accent)))";
      if (percent < 50) return "linear-gradient(90deg, hsl(var(--accent)), hsl(var(--chart-4)))";
      if (percent < 75) return "linear-gradient(90deg, hsl(var(--chart-4)), hsl(var(--secondary)))";
      return "linear-gradient(90deg, hsl(var(--secondary)), hsl(142, 73%, 55%))";
    };

    const heights = {
      sm: "h-2",
      md: "h-4",
      lg: "h-6",
    };

    const leafPositions = [25, 50, 75, 100];

    return (
      <div ref={ref} className={cn("relative w-full", className)}>
        <div
          className={cn(
            "relative w-full overflow-visible rounded-full bg-muted",
            heights[size]
          )}
          style={{
            borderRadius: "9999px 4px 9999px 4px",
          }}
        >
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{
              background: getGradient(percentage),
              borderRadius: "inherit",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              duration: 0.8,
            }}
          >
            <motion.div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3"
              style={{
                background: getProgressColor(percentage),
                borderRadius: "50%",
                boxShadow: `0 0 10px ${getProgressColor(percentage)}, 0 0 20px ${getProgressColor(percentage)}`,
              }}
              animate={{
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </motion.div>

          {showLeaves && (
            <AnimatePresence>
              {leafPositions.map((pos) => (
                percentage >= pos && (
                  <motion.div
                    key={pos}
                    className="absolute -top-3"
                    style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
                    initial={{ scale: 0, rotate: -45, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    exit={{ scale: 0, rotate: 45, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 15,
                      delay: 0.2,
                    }}
                  >
                    <LeafIcon
                      className={cn(
                        "w-4 h-4",
                        pos === 100 ? "text-secondary" : "text-secondary/70"
                      )}
                      filled={pos === 100}
                    />
                  </motion.div>
                )
              ))}
            </AnimatePresence>
          )}

          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: "inherit",
              background: "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)",
            }}
          />
        </div>

        {showPercentage && (
          <motion.span
            className="absolute right-0 top-full mt-1 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(percentage)}%
          </motion.span>
        )}
      </div>
    );
  }
);

GrowthProgress.displayName = "GrowthProgress";

const LeafIcon = ({ className, filled = false }: { className?: string; filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);

interface VineProgressProps {
  value: number;
  max?: number;
  className?: string;
  height?: number;
}

const VineProgress = React.forwardRef<HTMLDivElement, VineProgressProps>(
  ({ value, max = 100, className, height = 120 }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const segments = 5;
    const activeSegments = Math.floor((percentage / 100) * segments);

    return (
      <div ref={ref} className={cn("relative flex items-end", className)} style={{ height }}>
        <svg
          viewBox="0 0 60 100"
          className="w-full h-full"
          preserveAspectRatio="xMidYMax meet"
        >
          <defs>
            <linearGradient id="vineGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--secondary))" />
              <stop offset="50%" stopColor="hsl(142, 73%, 45%)" />
              <stop offset="100%" stopColor="hsl(142, 73%, 55%)" />
            </linearGradient>
          </defs>
          
          <motion.path
            d="M30 100 Q20 80 30 70 Q40 60 30 50 Q20 40 30 30 Q40 20 30 10 Q25 5 30 0"
            fill="none"
            stroke="url(#vineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: percentage / 100 }}
            transition={{ duration: 1, ease: "easeOut" }}
          />

          {Array.from({ length: segments }).map((_, i) => {
            const y = 90 - (i * 20);
            const isActive = i < activeSegments;
            const isLeft = i % 2 === 0;
            
            return (
              <motion.g
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: isActive ? 1 : 0,
                  opacity: isActive ? 1 : 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 15,
                  delay: i * 0.15,
                }}
                style={{ transformOrigin: `${isLeft ? 30 : 30}px ${y}px` }}
              >
                <ellipse
                  cx={isLeft ? 20 : 40}
                  cy={y - 5}
                  rx="8"
                  ry="5"
                  fill="hsl(var(--secondary))"
                  opacity="0.8"
                  transform={`rotate(${isLeft ? -30 : 30} ${isLeft ? 20 : 40} ${y - 5})`}
                />
              </motion.g>
            );
          })}

          {percentage >= 100 && (
            <motion.g
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 10,
                delay: 0.8,
              }}
            >
              <circle cx="30" cy="5" r="6" fill="hsl(var(--primary))" />
              <circle cx="30" cy="5" r="3" fill="hsl(var(--primary-foreground))" />
            </motion.g>
          )}
        </svg>
      </div>
    );
  }
);

VineProgress.displayName = "VineProgress";

export { GrowthProgress, VineProgress };
