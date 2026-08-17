import { motion } from "framer-motion";

interface AnimatedLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  animate?: boolean;
}

export function AnimatedLogo({ 
  size = 64, 
  className = "", 
  showText = false,
  animate = true 
}: AnimatedLogoProps) {
  const heartPath = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";
  
  const petalVariants = {
    initial: { scale: 0, opacity: 0, rotate: 0 },
    animate: (i: number) => ({
      scale: 1,
      opacity: 0.6,
      rotate: i * 45,
      transition: {
        delay: 0.1 + i * 0.08,
        duration: 0.6,
        ease: [0.34, 1.56, 0.64, 1]
      }
    })
  };

  const heartVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      transition: {
        delay: 0.3,
        duration: 0.8,
        ease: [0.34, 1.56, 0.64, 1]
      }
    },
    hover: {
      scale: 1.1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  const pulseVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: {
      scale: [0.8, 1.3, 0.8],
      opacity: [0.4, 0, 0.4],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const glowVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: [0.3, 0.6, 0.3],
      transition: {
        duration: 3,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const textVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay: 0.8,
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className={`flex flex-col items-center gap-3 ${className}`}
      initial="initial"
      animate={animate ? "animate" : "initial"}
      whileHover="hover"
      data-testid="animated-logo"
    >
      <motion.div 
        className="relative"
        style={{ width: size, height: size }}
      >
        {animate && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/30 to-accent/30 blur-xl"
              variants={glowVariants}
              style={{ width: size * 1.5, height: size * 1.5, left: -size * 0.25, top: -size * 0.25 }}
            />
            
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-primary/20"
              variants={pulseVariants}
              style={{ width: size, height: size }}
            />
          </>
        )}

        <svg 
          viewBox="0 0 24 24" 
          width={size} 
          height={size}
          className="relative z-10"
        >
          <defs>
            <linearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="50%" stopColor="hsl(340, 80%, 55%)" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
            
            <linearGradient id="petalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.1" />
            </linearGradient>

            <filter id="heartGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {animate && [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <motion.ellipse
              key={i}
              cx="12"
              cy="12"
              rx="3"
              ry="8"
              fill="url(#petalGradient)"
              custom={i}
              variants={petalVariants}
              style={{ transformOrigin: "12px 12px" }}
            />
          ))}

          <motion.path
            d={heartPath}
            fill="url(#heartGradient)"
            filter="url(#heartGlow)"
            variants={heartVariants}
            style={{ transformOrigin: "12px 12px" }}
          />

          {animate && (
            <motion.path
              d={heartPath}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="0.5"
              strokeOpacity="0.5"
              initial={{ pathLength: 0 }}
              animate={{ 
                pathLength: 1,
                transition: { delay: 0.5, duration: 1.5, ease: "easeInOut" }
              }}
            />
          )}
        </svg>
      </motion.div>

      {showText && (
        <motion.div 
          className="text-center"
          variants={textVariants}
        >
          <h1 
            className="text-2xl font-bold tracking-wide bg-gradient-to-r from-primary via-pink-500 to-accent bg-clip-text text-transparent"
            data-testid="text-logo-name"
          >
            LiLove
          </h1>
          <p 
            className="text-xs text-muted-foreground tracking-widest uppercase mt-1"
            data-testid="text-logo-tagline"
          >
            Grow with Love
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
