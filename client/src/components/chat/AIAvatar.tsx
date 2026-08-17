import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type AvatarExpression = 'neutral' | 'happy' | 'thinking' | 'excited' | 'empathetic';

interface AIAvatarProps {
  expression?: AvatarExpression;
  isTyping?: boolean;
  isListening?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

const eyeSizes = {
  sm: { width: 6, height: 8, pupil: 3 },
  md: { width: 8, height: 10, pupil: 4 },
  lg: { width: 12, height: 14, pupil: 6 },
};

const mouthSizes = {
  sm: { width: 10, gap: 6 },
  md: { width: 14, gap: 8 },
  lg: { width: 20, gap: 12 },
};

export function AIAvatar({ 
  expression = 'neutral', 
  isTyping = false, 
  isListening = false,
  size = 'md',
  className 
}: AIAvatarProps) {
  const eyeControls = useAnimation();
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  
  const eyeSize = eyeSizes[size];
  const mouthSize = mouthSizes[size];

  useEffect(() => {
    const blinkSequence = async () => {
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        await eyeControls.start({ scaleY: 0.1, transition: { duration: 0.1 } });
        await eyeControls.start({ scaleY: 1, transition: { duration: 0.1 } });
      }
    };
    blinkSequence();
  }, [eyeControls]);

  useEffect(() => {
    if (isTyping) {
      const lookAroundSequence = async () => {
        while (isTyping) {
          await new Promise(resolve => setTimeout(resolve, 800));
          setEyePosition({ 
            x: (Math.random() - 0.5) * 4, 
            y: (Math.random() - 0.5) * 2 
          });
        }
      };
      lookAroundSequence();
    } else {
      setEyePosition({ x: 0, y: 0 });
    }
  }, [isTyping]);

  const getEyeShape = () => {
    switch (expression) {
      case 'happy':
      case 'excited':
        return { scaleY: 0.7, borderRadius: '50%' };
      case 'thinking':
        return { scaleY: 0.85, translateY: -1 };
      case 'empathetic':
        return { scaleY: 0.9, translateY: 1 };
      default:
        return { scaleY: 1 };
    }
  };

  const getMouthPath = () => {
    switch (expression) {
      case 'happy':
        return `M ${-mouthSize.width/2} 0 Q 0 ${mouthSize.width/2} ${mouthSize.width/2} 0`;
      case 'excited':
        return `M ${-mouthSize.width/2} -2 Q 0 ${mouthSize.width/1.5} ${mouthSize.width/2} -2`;
      case 'thinking':
        return `M ${-mouthSize.width/3} 0 L ${mouthSize.width/3} 2`;
      case 'empathetic':
        return `M ${-mouthSize.width/2} 2 Q 0 -2 ${mouthSize.width/2} 2`;
      default:
        return `M ${-mouthSize.width/2} 0 Q 0 2 ${mouthSize.width/2} 0`;
    }
  };

  const getGradientColors = () => {
    switch (expression) {
      case 'happy':
      case 'excited':
        return ['from-rose-400 via-pink-400 to-purple-500', 'from-rose-300 via-pink-300 to-purple-400'];
      case 'empathetic':
        return ['from-blue-400 via-indigo-400 to-purple-500', 'from-blue-300 via-indigo-300 to-purple-400'];
      case 'thinking':
        return ['from-cyan-400 via-teal-400 to-emerald-500', 'from-cyan-300 via-teal-300 to-emerald-400'];
      default:
        return ['from-primary via-pink-500 to-purple-500', 'from-primary/80 via-pink-400 to-purple-400'];
    }
  };

  const [gradientDark, gradientLight] = getGradientColors();

  return (
    <motion.div
      className={cn("relative", sizeClasses[size], className)}
      animate={{
        scale: isListening ? [1, 1.05, 1] : 1,
      }}
      transition={{
        scale: { duration: 1.5, repeat: isListening ? Infinity : 0 },
      }}
      data-testid="ai-avatar"
    >
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full bg-gradient-to-br opacity-30 blur-md",
          gradientLight
        )}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className={cn(
          "relative w-full h-full rounded-full bg-gradient-to-br shadow-lg",
          gradientDark
        )}
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <motion.div
          className="absolute inset-1 rounded-full bg-card/90"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2), transparent 70%)',
          }}
        />

        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 w-full h-full"
        >
          <motion.g
            className="eyes"
            animate={eyeControls}
            style={getEyeShape()}
          >
            <motion.ellipse
              cx="35"
              cy="42"
              rx={eyeSize.width}
              ry={eyeSize.height}
              className="fill-slate-700 dark:fill-slate-200"
              animate={{ 
                cx: 35 + eyePosition.x,
                cy: 42 + eyePosition.y 
              }}
            />
            <motion.ellipse
              cx="65"
              cy="42"
              rx={eyeSize.width}
              ry={eyeSize.height}
              className="fill-slate-700 dark:fill-slate-200"
              animate={{ 
                cx: 65 + eyePosition.x,
                cy: 42 + eyePosition.y 
              }}
            />

            <motion.circle
              cx="36"
              cy="41"
              r={eyeSize.pupil}
              className="fill-slate-900 dark:fill-white"
              animate={{ 
                cx: 36 + eyePosition.x * 1.2,
                cy: 41 + eyePosition.y * 1.2 
              }}
            />
            <motion.circle
              cx="66"
              cy="41"
              r={eyeSize.pupil}
              className="fill-slate-900 dark:fill-white"
              animate={{ 
                cx: 66 + eyePosition.x * 1.2,
                cy: 41 + eyePosition.y * 1.2 
              }}
            />

            {(expression === 'happy' || expression === 'excited') && (
              <>
                <circle cx="33" cy="39" r="2" className="fill-white/60" />
                <circle cx="63" cy="39" r="2" className="fill-white/60" />
              </>
            )}
          </motion.g>

          <motion.g transform="translate(50, 62)">
            <motion.path
              d={getMouthPath()}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              className="stroke-slate-700 dark:stroke-slate-200"
              initial={false}
              animate={{ d: getMouthPath() }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </motion.g>

          {expression === 'excited' && (
            <>
              <motion.circle
                cx="25"
                cy="50"
                r="4"
                className="fill-rose-300/60"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <motion.circle
                cx="75"
                cy="50"
                r="4"
                className="fill-rose-300/60"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
            </>
          )}

          {expression === 'thinking' && (
            <motion.g
              animate={{ 
                y: [-2, 2, -2],
                rotate: [-5, 5, -5]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ellipse cx="82" cy="25" rx="3" ry="3" className="fill-primary/40" />
              <ellipse cx="88" cy="18" rx="2" ry="2" className="fill-primary/30" />
              <ellipse cx="92" cy="12" rx="1.5" ry="1.5" className="fill-primary/20" />
            </motion.g>
          )}
        </svg>
      </motion.div>

      {isListening && (
        <motion.div
          className="absolute -inset-1 rounded-full border-2 border-primary"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.8, 0, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        />
      )}
    </motion.div>
  );
}

export default AIAvatar;
