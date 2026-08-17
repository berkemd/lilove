import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sparkles, Snowflake, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils';

type Season = 'spring' | 'summer' | 'fall' | 'winter';
type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'aurora' | 'starry';

interface ParticleSystemProps {
  season?: Season;
  timeOfDay?: TimeOfDay;
  weather?: WeatherType;
  intensity?: number;
  mousePosition?: { x: number; y: number };
  showHearts?: boolean;
  showSparkles?: boolean;
  containerRef?: React.RefObject<HTMLDivElement>;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  opacity: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 0.5 + Math.random() * 1.5,
    duration: 5 + Math.random() * 10,
    delay: Math.random() * 5,
    rotation: Math.random() * 360,
    opacity: 0.3 + Math.random() * 0.7,
  }));
}

export function HeartParticles({ count = 15, mousePosition }: { count?: number; mousePosition?: { x: number; y: number } }) {
  const particles = useMemo(() => generateParticles(count), [count]);
  
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" data-testid="heart-particles">
      {particles.map((p) => {
        const mouseInfluence = mousePosition ? {
          x: (mousePosition.x - 50) * 0.02 * p.size,
          y: (mousePosition.y - 50) * 0.02 * p.size,
        } : { x: 0, y: 0 };
        
        return (
          <motion.div
            key={p.id}
            className="absolute"
            style={{ left: `${p.x}%`, bottom: '0%' }}
            initial={{ y: 0, opacity: 0, scale: 0 }}
            animate={{
              y: [0, -400 - p.y * 5],
              x: [0, Math.sin(p.id) * 50 + mouseInfluence.x * 20, Math.cos(p.id) * 30 + mouseInfluence.x * 20],
              opacity: [0, p.opacity, p.opacity, 0],
              scale: [0, p.size, p.size, 0],
              rotate: [0, p.rotation, -p.rotation, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeOut",
            }}
          >
            <Heart 
              className="text-pink-400/60 dark:text-pink-300/50 fill-current" 
              style={{ width: `${12 + p.size * 8}px`, height: `${12 + p.size * 8}px` }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

export function SparkleEffect({ 
  active = false, 
  position = { x: 50, y: 50 },
  onComplete 
}: { 
  active?: boolean; 
  position?: { x: number; y: number };
  onComplete?: () => void;
}) {
  const sparkles = useMemo(() => 
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      angle: (i / 20) * 360,
      distance: 30 + Math.random() * 70,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.3,
    })), 
  []);

  return (
    <AnimatePresence>
      {active && (
        <div 
          className="absolute pointer-events-none z-50"
          style={{ left: `${position.x}%`, top: `${position.y}%` }}
          data-testid="sparkle-effect"
        >
          {sparkles.map((s) => (
            <motion.div
              key={s.id}
              className="absolute"
              initial={{ 
                x: 0, 
                y: 0, 
                scale: 0, 
                opacity: 1,
              }}
              animate={{ 
                x: Math.cos(s.angle * Math.PI / 180) * s.distance,
                y: Math.sin(s.angle * Math.PI / 180) * s.distance,
                scale: [0, 1.5, 0],
                opacity: [1, 1, 0],
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ 
                duration: 0.8, 
                delay: s.delay,
                ease: "easeOut",
              }}
              onAnimationComplete={() => s.id === sparkles.length - 1 && onComplete?.()}
            >
              <Sparkles 
                className="text-yellow-400 dark:text-yellow-300 drop-shadow-lg" 
                style={{ width: s.size, height: s.size }}
              />
            </motion.div>
          ))}
          <motion.div
            className="absolute -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-yellow-300/40 dark:bg-yellow-200/30 blur-xl"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: [0, 2, 0], opacity: [0.8, 0.4, 0] }}
            transition={{ duration: 0.6 }}
          />
        </div>
      )}
    </AnimatePresence>
  );
}

export function SeasonalParticles({ 
  season, 
  count = 30,
  mousePosition,
  weather 
}: { 
  season: Season; 
  count?: number;
  mousePosition?: { x: number; y: number };
  weather?: WeatherType;
}) {
  const particles = useMemo(() => generateParticles(count), [count]);
  
  const getParticleConfig = useCallback((season: Season, weather?: WeatherType) => {
    const windEffect = weather === 'rainy' ? 2 : weather === 'cloudy' ? 1.5 : 1;
    
    switch (season) {
      case 'spring':
        return {
          colors: ['pink-300', 'pink-400', 'rose-300', 'white'],
          icon: 'petal',
          fallPattern: 'flutter',
          windEffect,
        };
      case 'summer':
        return {
          colors: ['emerald-400', 'green-300', 'lime-300'],
          icon: 'leaf',
          fallPattern: 'gentle',
          windEffect,
        };
      case 'fall':
        return {
          colors: ['orange-400', 'amber-500', 'red-400', 'yellow-500'],
          icon: 'leaf',
          fallPattern: 'tumble',
          windEffect,
        };
      case 'winter':
        return {
          colors: ['white', 'blue-100', 'sky-100'],
          icon: 'snowflake',
          fallPattern: 'drift',
          windEffect,
        };
    }
  }, []);

  const config = getParticleConfig(season, weather);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" data-testid={`seasonal-particles-${season}`}>
      {particles.map((p) => {
        const mouseInfluence = mousePosition ? {
          x: (mousePosition.x - 50) * 0.015,
          y: (mousePosition.y - 50) * 0.01,
        } : { x: 0, y: 0 };
        
        const colorIndex = p.id % config.colors.length;
        const color = config.colors[colorIndex];
        
        const getAnimation = () => {
          switch (config.fallPattern) {
            case 'flutter':
              return {
                y: [-20, 400],
                x: [0, Math.sin(p.id * 0.5) * 100 * config.windEffect + mouseInfluence.x * 30],
                rotate: [0, 360 * (p.id % 2 === 0 ? 1 : -1)],
              };
            case 'tumble':
              return {
                y: [-20, 400],
                x: [0, Math.sin(p.id * 0.3) * 80 * config.windEffect + Math.cos(p.id) * 40 + mouseInfluence.x * 30],
                rotate: [0, 720 * (p.id % 2 === 0 ? 1 : -1)],
              };
            case 'drift':
              return {
                y: [-20, 350],
                x: [0, Math.sin(p.id * 0.7) * 60 * config.windEffect + mouseInfluence.x * 20],
                rotate: [0, 180],
              };
            default:
              return {
                y: [-20, 380],
                x: [0, Math.sin(p.id * 0.4) * 50 + mouseInfluence.x * 25],
                rotate: [0, 90],
              };
          }
        };

        return (
          <motion.div
            key={p.id}
            className="absolute"
            style={{ left: `${p.x}%`, top: '-5%' }}
            animate={getAnimation()}
            transition={{
              duration: p.duration * (season === 'winter' ? 1.5 : 1),
              repeat: Infinity,
              delay: p.delay,
              ease: season === 'winter' ? 'linear' : 'easeInOut',
            }}
          >
            {config.icon === 'snowflake' ? (
              <Snowflake 
                className={cn(`text-${color}`, "drop-shadow-sm")}
                style={{ 
                  width: `${8 + p.size * 6}px`, 
                  height: `${8 + p.size * 6}px`,
                  opacity: p.opacity,
                }}
              />
            ) : config.icon === 'petal' ? (
              <motion.div
                className={cn(
                  "rounded-full",
                  `bg-${color}`,
                )}
                style={{
                  width: `${6 + p.size * 4}px`,
                  height: `${10 + p.size * 6}px`,
                  opacity: p.opacity,
                  borderRadius: '50% 0 50% 50%',
                }}
                animate={{ 
                  rotateX: [0, 180, 360],
                  rotateY: [0, 90, 180, 270, 360],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            ) : (
              <Leaf 
                className={cn(`text-${color}`, "drop-shadow-sm")}
                style={{ 
                  width: `${10 + p.size * 5}px`, 
                  height: `${10 + p.size * 5}px`,
                  opacity: p.opacity,
                }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export function FireflyParticles({ 
  count = 25, 
  mousePosition,
  active = true 
}: { 
  count?: number; 
  mousePosition?: { x: number; y: number };
  active?: boolean;
}) {
  const fireflies = useMemo(() => 
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 20 + Math.random() * 60,
      size: 2 + Math.random() * 4,
      glowDuration: 1 + Math.random() * 2,
      moveDuration: 8 + Math.random() * 12,
      pathRadius: 20 + Math.random() * 40,
    })),
  [count]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="firefly-particles">
      {fireflies.map((f) => {
        const mouseInfluence = mousePosition ? {
          x: (mousePosition.x - f.x) * 0.1,
          y: (mousePosition.y - f.y) * 0.1,
        } : { x: 0, y: 0 };

        return (
          <motion.div
            key={f.id}
            className="absolute"
            style={{ left: `${f.x}%`, top: `${f.y}%` }}
            animate={{
              x: [
                0,
                f.pathRadius + mouseInfluence.x,
                f.pathRadius * 0.5 + mouseInfluence.x,
                -f.pathRadius * 0.3 + mouseInfluence.x,
                0,
              ],
              y: [
                0,
                -f.pathRadius * 0.5 + mouseInfluence.y,
                f.pathRadius * 0.3 + mouseInfluence.y,
                -f.pathRadius * 0.7 + mouseInfluence.y,
                0,
              ],
            }}
            transition={{
              duration: f.moveDuration,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.div
              className="relative"
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: f.glowDuration,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div
                className="rounded-full bg-yellow-300 dark:bg-yellow-200"
                style={{ width: f.size, height: f.size }}
              />
              <div
                className="absolute inset-0 rounded-full bg-yellow-200/60 dark:bg-yellow-100/40 blur-md"
                style={{ 
                  width: f.size * 3, 
                  height: f.size * 3,
                  transform: 'translate(-50%, -50%)',
                  left: '50%',
                  top: '50%',
                }}
              />
              <div
                className="absolute inset-0 rounded-full bg-yellow-100/30 dark:bg-yellow-50/20 blur-xl"
                style={{ 
                  width: f.size * 6, 
                  height: f.size * 6,
                  transform: 'translate(-50%, -50%)',
                  left: '50%',
                  top: '50%',
                }}
              />
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

export function RainRipples({ 
  count = 8, 
  active = true 
}: { 
  count?: number; 
  active?: boolean;
}) {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  useEffect(() => {
    if (!active) return;
    
    const interval = setInterval(() => {
      const newRipple = {
        id: Date.now() + Math.random(),
        x: 20 + Math.random() * 60,
        y: 70 + Math.random() * 20,
      };
      setRipples(prev => [...prev.slice(-count + 1), newRipple]);
    }, 400);

    return () => clearInterval(interval);
  }, [active, count]);

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="rain-ripples">
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.div
            key={ripple.id}
            className="absolute"
            style={{ left: `${ripple.x}%`, top: `${ripple.y}%` }}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          >
            <div className="w-4 h-2 rounded-full border border-blue-300/60 dark:border-blue-200/40" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function VolumetricSunRays({ 
  intensity = 1,
  mousePosition 
}: { 
  intensity?: number;
  mousePosition?: { x: number; y: number };
}) {
  const rays = useMemo(() => 
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: -30 + i * 8,
      width: 60 + Math.random() * 80,
      opacity: 0.1 + Math.random() * 0.15,
      delay: i * 0.3,
    })),
  []);

  const mouseOffset = mousePosition ? (mousePosition.x - 50) * 0.3 : 0;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" data-testid="volumetric-sun-rays">
      {rays.map((ray) => (
        <motion.div
          key={ray.id}
          className="absolute origin-top-right"
          style={{
            top: 0,
            right: '10%',
            width: ray.width,
            height: '120%',
            background: `linear-gradient(to bottom, rgba(255, 236, 179, ${ray.opacity * intensity}), transparent 70%)`,
            transform: `rotate(${ray.angle + mouseOffset}deg)`,
            filter: 'blur(8px)',
          }}
          animate={{
            opacity: [ray.opacity * 0.5, ray.opacity, ray.opacity * 0.5],
            width: [ray.width * 0.9, ray.width * 1.1, ray.width * 0.9],
          }}
          transition={{
            duration: 4 + ray.id * 0.5,
            repeat: Infinity,
            delay: ray.delay,
            ease: "easeInOut",
          }}
        />
      ))}
      <motion.div
        className="absolute top-0 right-0 w-32 h-32 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255, 236, 179, 0.6) 0%, rgba(255, 200, 87, 0.3) 40%, transparent 70%)',
          filter: 'blur(20px)',
          transform: `translate(30%, -30%)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 0.9, 0.6],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

export function MagicDust({ 
  count = 40,
  mousePosition,
  color = 'gold'
}: {
  count?: number;
  mousePosition?: { x: number; y: number };
  color?: 'gold' | 'silver' | 'rainbow';
}) {
  const particles = useMemo(() => generateParticles(count), [count]);

  const getColor = (index: number) => {
    switch (color) {
      case 'rainbow':
        const colors = ['red-400', 'orange-400', 'yellow-400', 'green-400', 'blue-400', 'purple-400', 'pink-400'];
        return colors[index % colors.length];
      case 'silver':
        return 'gray-200';
      default:
        return 'yellow-300';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" data-testid="magic-dust">
      {particles.map((p) => {
        const mouseInfluence = mousePosition ? {
          x: (mousePosition.x - p.x) * 0.05,
          y: (mousePosition.y - p.y) * 0.05,
        } : { x: 0, y: 0 };

        return (
          <motion.div
            key={p.id}
            className="absolute"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            animate={{
              x: [0, 15 + mouseInfluence.x, -10 + mouseInfluence.x, 20 + mouseInfluence.x, 0],
              y: [0, -20 + mouseInfluence.y, 10 + mouseInfluence.y, -15 + mouseInfluence.y, 0],
              opacity: [0.2, 0.8, 0.4, 0.9, 0.2],
              scale: [0.5, 1, 0.7, 1.2, 0.5],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          >
            <div
              className={cn(
                "rounded-full",
                `bg-${getColor(p.id)}`,
                "shadow-lg"
              )}
              style={{
                width: `${2 + p.size * 2}px`,
                height: `${2 + p.size * 2}px`,
                boxShadow: color === 'gold' 
                  ? '0 0 6px rgba(255, 215, 0, 0.6)' 
                  : color === 'silver'
                  ? '0 0 6px rgba(192, 192, 192, 0.6)'
                  : `0 0 6px currentColor`,
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}

export default function ParticleSystem({
  season = 'summer',
  timeOfDay = 'day',
  weather = 'sunny',
  intensity = 1,
  mousePosition,
  showHearts = false,
  showSparkles = false,
}: ParticleSystemProps) {
  const isNight = timeOfDay === 'night' || timeOfDay === 'dusk';
  const particleCount = Math.round(20 * intensity);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" data-testid="particle-system">
      {showHearts && (
        <HeartParticles count={Math.round(15 * intensity)} mousePosition={mousePosition} />
      )}

      <SeasonalParticles 
        season={season} 
        count={particleCount} 
        mousePosition={mousePosition}
        weather={weather}
      />

      {isNight && (
        <FireflyParticles 
          count={Math.round(25 * intensity)} 
          mousePosition={mousePosition}
          active={true}
        />
      )}

      {weather === 'rainy' && (
        <RainRipples count={8} active={true} />
      )}

      {weather === 'sunny' && timeOfDay === 'day' && (
        <VolumetricSunRays intensity={intensity} mousePosition={mousePosition} />
      )}

      <MagicDust 
        count={Math.round(30 * intensity)} 
        mousePosition={mousePosition}
        color={isNight ? 'silver' : 'gold'}
      />
    </div>
  );
}
