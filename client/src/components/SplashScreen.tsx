import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedLogo } from "./AnimatedLogo";

interface SplashScreenProps {
  onComplete?: () => void;
  minDisplayTime?: number;
}

const inspirationalMessages = [
  "Preparing your growth journey...",
  "Cultivating your potential...",
  "Nurturing positive habits...",
  "Building your sanctuary...",
  "Awakening your best self..."
];

export function SplashScreen({ 
  onComplete, 
  minDisplayTime = 2500 
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % inspirationalMessages.length);
    }, 800);

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 2, 100));
    }, minDisplayTime / 50);

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete?.();
      }, 500);
    }, minDisplayTime);

    return () => {
      clearTimeout(timer);
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [minDisplayTime, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            scale: 1.1,
            transition: { duration: 0.5, ease: "easeInOut" }
          }}
          data-testid="splash-screen"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
          
          <motion.div
            className="absolute inset-0 opacity-30"
            animate={{
              background: [
                "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 80% 70%, hsl(var(--accent) / 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.3) 0%, transparent 50%)",
                "radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.3) 0%, transparent 50%)"
              ]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/20"
              initial={{
                x: Math.random() * window.innerWidth,
                y: window.innerHeight + 20
              }}
              animate={{
                y: -20,
                x: Math.random() * window.innerWidth
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "linear"
              }}
            />
          ))}

          <div className="relative z-10 flex flex-col items-center gap-8">
            <AnimatedLogo size={120} showText animate />

            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <AnimatePresence mode="wait">
                <motion.p
                  key={messageIndex}
                  className="text-muted-foreground text-sm tracking-wide"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  data-testid="text-splash-message"
                >
                  {inspirationalMessages[messageIndex]}
                </motion.p>
              </AnimatePresence>
            </motion.div>

            <motion.div
              className="w-48 h-1 bg-muted rounded-full overflow-hidden"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
            >
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-pink-500 to-accent rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.1 }}
                data-testid="progress-splash-loading"
              />
            </motion.div>

            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                />
              ))}
            </motion.div>
          </div>

          <motion.p
            className="absolute bottom-8 text-xs text-muted-foreground/60 tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            data-testid="text-splash-footer"
          >
            Your Growth Companion
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
