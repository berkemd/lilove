import { motion } from "framer-motion";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  message?: string;
}

const sizeMap = {
  sm: 24,
  md: 40,
  lg: 64
};

export function LoadingSpinner({ 
  size = "md", 
  className = "",
  message
}: LoadingSpinnerProps) {
  const pixelSize = sizeMap[size];
  
  const heartPath = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

  return (
    <div 
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
      data-testid="loading-spinner"
    >
      <div className="relative" style={{ width: pixelSize, height: pixelSize }}>
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.3, 0, 0.3]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div
          className="absolute inset-0 rounded-full bg-accent/20"
          animate={{
            scale: [1, 1.6, 1],
            opacity: [0.2, 0, 0.2]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3
          }}
        />

        <svg 
          viewBox="0 0 24 24" 
          width={pixelSize} 
          height={pixelSize}
          className="relative z-10"
        >
          <defs>
            <linearGradient id="loadingHeartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
          </defs>
          
          <motion.path
            d={heartPath}
            fill="url(#loadingHeartGradient)"
            animate={{
              scale: [1, 1.15, 1, 1.1, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.2, 0.4, 0.6, 1]
            }}
            style={{ transformOrigin: "12px 12px" }}
          />
        </svg>

        <motion.div
          className="absolute inset-0"
          style={{ width: pixelSize, height: pixelSize }}
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-primary"
              style={{
                left: "50%",
                top: "50%"
              }}
              animate={{
                x: [0, Math.cos(i * Math.PI / 2) * pixelSize * 0.6, 0],
                y: [0, Math.sin(i * Math.PI / 2) * pixelSize * 0.6, 0],
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut"
              }}
            />
          ))}
        </motion.div>
      </div>

      {message && (
        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          data-testid="text-loading-message"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}

export function LoadingPage({ message = "Loading..." }: { message?: string }) {
  return (
    <div 
      className="flex items-center justify-center min-h-[50vh]"
      data-testid="loading-page"
    >
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
}

export function LoadingOverlay({ 
  message = "Please wait...",
  visible = true 
}: { 
  message?: string;
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="loading-overlay"
    >
      <div className="bg-card p-8 rounded-xl shadow-lg border">
        <LoadingSpinner size="lg" message={message} />
      </div>
    </motion.div>
  );
}
