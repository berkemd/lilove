import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { motion, AnimatePresence, HTMLMotionProps } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const liLoveButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 overflow-hidden",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary-border",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border",
        outline:
          "border [border-color:var(--button-outline)] shadow-xs",
        secondary:
          "bg-secondary text-secondary-foreground border border-secondary-border",
        ghost: "border border-transparent",
        gradient:
          "bg-gradient-to-r from-primary via-pink-500 to-accent text-white border-none",
      },
      size: {
        default: "min-h-9 px-4 py-2",
        sm: "min-h-8 rounded-md px-3 text-xs",
        lg: "min-h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface RippleEffect {
  id: number;
  x: number;
  y: number;
}

export interface LiLoveButtonProps
  extends Omit<HTMLMotionProps<"button">, "children">,
    VariantProps<typeof liLoveButtonVariants> {
  asChild?: boolean;
  showHeartRipple?: boolean;
  bounceOnSuccess?: boolean;
  isSuccess?: boolean;
  children: React.ReactNode;
}

const LiLoveButton = React.forwardRef<HTMLButtonElement, LiLoveButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      showHeartRipple = true,
      bounceOnSuccess = true,
      isSuccess = false,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = React.useState<RippleEffect[]>([]);
    const [shouldBounce, setShouldBounce] = React.useState(false);
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    React.useEffect(() => {
      if (isSuccess && bounceOnSuccess) {
        setShouldBounce(true);
        const timer = setTimeout(() => setShouldBounce(false), 600);
        return () => clearTimeout(timer);
      }
    }, [isSuccess, bounceOnSuccess]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (showHeartRipple && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const id = Date.now();
        setRipples((prev) => [...prev, { id, x, y }]);
        
        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== id));
        }, 800);
      }

      onClick?.(e as any);
    };

    const Comp = asChild ? Slot : motion.button;

    return (
      <Comp
        ref={(node: HTMLButtonElement | null) => {
          (buttonRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(liLoveButtonVariants({ variant, size, className }))}
        onClick={handleClick}
        animate={
          shouldBounce
            ? {
                scale: [1, 1.1, 0.95, 1.05, 1],
              }
            : {}
        }
        transition={{
          duration: 0.4,
          ease: "easeOut",
        }}
        whileHover={{
          scale: 1.02,
          transition: { type: "spring", stiffness: 400, damping: 25 },
        }}
        whileTap={{
          scale: 0.98,
        }}
        {...props}
      >
        {children}

        <AnimatePresence>
          {ripples.map((ripple) => (
            <HeartRipple key={ripple.id} x={ripple.x} y={ripple.y} />
          ))}
        </AnimatePresence>

        {variant === "gradient" && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
            }}
            initial={{ x: "-100%" }}
            whileHover={{
              x: "100%",
              transition: { duration: 0.6, ease: "linear" },
            }}
          />
        )}
      </Comp>
    );
  }
);

LiLoveButton.displayName = "LiLoveButton";

function HeartRipple({ x, y }: { x: number; y: number }) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
      }}
      initial={{ scale: 0, opacity: 0.6 }}
      animate={{ scale: 3, opacity: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Heart
        className="w-6 h-6 text-current"
        style={{ fill: "currentColor", opacity: 0.3 }}
      />
    </motion.div>
  );
}

interface BloomButtonProps extends LiLoveButtonProps {
  bloomColor?: string;
}

const BloomButton = React.forwardRef<HTMLButtonElement, BloomButtonProps>(
  ({ className, bloomColor = "hsl(var(--primary))", children, ...props }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false);

    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
          "min-h-9 px-4 py-2",
          "bg-primary text-primary-foreground border border-primary-border",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          "overflow-hidden",
          className
        )}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        {...(props as any)}
      >
        <AnimatePresence>
          {isPressed && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ scale: 0 }}
              animate={{ scale: 2.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{
                background: `radial-gradient(circle, ${bloomColor} 0%, transparent 70%)`,
                opacity: 0.3,
              }}
            />
          )}
        </AnimatePresence>
        
        <span className="relative z-10">{children}</span>

        <motion.div
          className="absolute inset-0 opacity-0 pointer-events-none"
          animate={{
            boxShadow: isPressed
              ? `0 0 20px ${bloomColor}, 0 0 40px ${bloomColor}`
              : "none",
            opacity: isPressed ? 0.5 : 0,
          }}
          transition={{ duration: 0.2 }}
        />
      </motion.button>
    );
  }
);

BloomButton.displayName = "BloomButton";

interface HeartPulseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
}

const HeartPulseButton = React.forwardRef<HTMLButtonElement, HeartPulseButtonProps>(
  ({ className, children, isActive = false, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 rounded-full",
          "min-h-9 px-4 py-2",
          "bg-gradient-to-r from-primary to-accent text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={
          isActive
            ? {
                scale: [1, 1.1, 1, 1.1, 1],
              }
            : {}
        }
        transition={{
          duration: 1.5,
          repeat: isActive ? Infinity : 0,
          ease: "easeInOut",
        }}
        {...(props as any)}
      >
        <Heart
          className={cn(
            "w-4 h-4 mr-1",
            isActive && "animate-heartbeat"
          )}
          style={{ fill: "currentColor" }}
        />
        {children}

        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "inherit",
              filter: "blur(8px)",
              opacity: 0.4,
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.4, 0.2, 0.4],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.button>
    );
  }
);

HeartPulseButton.displayName = "HeartPulseButton";

export { LiLoveButton, liLoveButtonVariants, BloomButton, HeartPulseButton };
