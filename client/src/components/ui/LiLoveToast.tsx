import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info" | "default";

interface LiLoveToastData {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
  duration?: number;
}

interface LiLoveToastContextValue {
  toasts: LiLoveToastData[];
  showToast: (toast: Omit<LiLoveToastData, "id">) => void;
  dismissToast: (id: string) => void;
}

const LiLoveToastContext = React.createContext<LiLoveToastContextValue | null>(null);

export function LiLoveToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<LiLoveToastData[]>([]);

  const showToast = React.useCallback((toast: Omit<LiLoveToastData, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);

    const duration = toast.duration || 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <LiLoveToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <LiLoveToastContainer />
    </LiLoveToastContext.Provider>
  );
}

export function useLiLoveToast() {
  const context = React.useContext(LiLoveToastContext);
  if (!context) {
    throw new Error("useLiLoveToast must be used within LiLoveToastProvider");
  }
  return context;
}

function LiLoveToastContainer() {
  const context = React.useContext(LiLoveToastContext);
  if (!context) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {context.toasts.map((toast) => (
          <LiLoveToastItem
            key={toast.id}
            toast={toast}
            onDismiss={() => context.dismissToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface LiLoveToastItemProps {
  toast: LiLoveToastData;
  onDismiss: () => void;
}

function LiLoveToastItem({ toast, onDismiss }: LiLoveToastItemProps) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    default: Heart,
  };

  const colors = {
    success: "text-secondary",
    error: "text-destructive",
    info: "text-primary",
    default: "text-primary",
  };

  const Icon = icons[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className={cn(
        "relative pointer-events-auto w-80 rounded-lg border bg-card p-4 shadow-lg overflow-hidden",
        "flex items-start gap-3"
      )}
      style={{
        borderRadius: "16px 6px 16px 6px",
      }}
      data-testid={`toast-${toast.type}`}
    >
      <motion.div
        initial={{ scale: 0.5, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 15,
          delay: 0.1,
        }}
      >
        <Icon className={cn("w-5 h-5", colors[toast.type])} />
      </motion.div>

      <div className="flex-1 min-w-0">
        <motion.p
          className="text-sm font-semibold text-foreground"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
        >
          {toast.title}
        </motion.p>
        {toast.description && (
          <motion.p
            className="text-sm text-muted-foreground mt-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            {toast.description}
          </motion.p>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="text-muted-foreground hover:text-foreground transition-colors"
        data-testid="toast-dismiss"
      >
        <X className="w-4 h-4" />
      </button>

      {toast.type === "success" && <ConfettiEffect />}

      <motion.div
        className="absolute bottom-0 left-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${
            toast.type === "success"
              ? "hsl(var(--secondary))"
              : toast.type === "error"
              ? "hsl(var(--destructive))"
              : "hsl(var(--primary))"
          }, transparent)`,
        }}
        initial={{ width: "100%" }}
        animate={{ width: "0%" }}
        transition={{
          duration: (toast.duration || 4000) / 1000,
          ease: "linear",
        }}
      />
    </motion.div>
  );
}

function ConfettiEffect() {
  const particles = Array.from({ length: 12 });
  const colors = [
    "hsl(var(--primary))",
    "hsl(var(--accent))",
    "hsl(var(--secondary))",
    "hsl(340, 80%, 55%)",
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * 360;
        const delay = i * 0.02;
        const color = colors[i % colors.length];
        const isHeart = i % 3 === 0;

        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2"
            initial={{
              x: 0,
              y: 0,
              scale: 0,
              opacity: 1,
            }}
            animate={{
              x: Math.cos((angle * Math.PI) / 180) * 60,
              y: Math.sin((angle * Math.PI) / 180) * 40 - 20,
              scale: [0, 1, 0.5],
              opacity: [1, 1, 0],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 0.8,
              delay,
              ease: "easeOut",
            }}
          >
            {isHeart ? (
              <Heart className="w-2 h-2" style={{ color, fill: color }} />
            ) : (
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: color }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

export { LiLoveToastContainer };
