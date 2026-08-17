import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const LiLoveTabs = TabsPrimitive.Root;

interface TabContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabContext = React.createContext<TabContextValue | null>(null);

interface LiLoveTabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  defaultValue?: string;
}

const LiLoveTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  LiLoveTabsListProps
>(({ className, children, ...props }, ref) => {
  const [activeTab, setActiveTab] = React.useState("");
  const [tabPositions, setTabPositions] = React.useState<Map<string, { left: number; width: number }>>(new Map());
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (listRef.current) {
      const tabs = listRef.current.querySelectorAll('[role="tab"]');
      const positions = new Map<string, { left: number; width: number }>();
      
      tabs.forEach((tab) => {
        const value = tab.getAttribute("data-value") || "";
        const rect = tab.getBoundingClientRect();
        const listRect = listRef.current!.getBoundingClientRect();
        positions.set(value, {
          left: rect.left - listRect.left,
          width: rect.width,
        });
      });
      
      setTabPositions(positions);
    }
  }, [children]);

  const activePosition = tabPositions.get(activeTab);

  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      <TabsPrimitive.List
        ref={(node) => {
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
          (listRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={cn(
          "relative inline-flex items-center justify-center gap-1 rounded-lg bg-muted/50 p-1",
          className
        )}
        {...props}
      >
        {children}
        
        <AnimatePresence>
          {activePosition && (
            <motion.div
              className="absolute bottom-0 h-0.5 rounded-full"
              style={{
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
              }}
              initial={false}
              animate={{
                left: activePosition.left,
                width: activePosition.width,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
              }}
            />
          )}
        </AnimatePresence>
      </TabsPrimitive.List>
    </TabContext.Provider>
  );
});
LiLoveTabsList.displayName = "LiLoveTabsList";

interface LiLoveTabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  value: string;
}

const LiLoveTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  LiLoveTabsTriggerProps
>(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(TabContext);
  const isActive = context?.activeTab === value;

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      value={value}
      data-value={value}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all",
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground",
        className
      )}
      onClick={() => context?.setActiveTab(value)}
      {...props}
    >
      <motion.span
        initial={false}
        animate={{
          scale: isActive ? 1.05 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
      >
        {children}
      </motion.span>
      
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-md"
            style={{
              background: "hsl(var(--background))",
              boxShadow: "0 1px 3px hsl(var(--foreground) / 0.1)",
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            style={{ zIndex: -1 }}
          />
        )}
      </AnimatePresence>
    </TabsPrimitive.Trigger>
  );
});
LiLoveTabsTrigger.displayName = "LiLoveTabsTrigger";

const LiLoveTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  >
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
      }}
    >
      {children}
    </motion.div>
  </TabsPrimitive.Content>
));
LiLoveTabsContent.displayName = "LiLoveTabsContent";

interface MorphingTabsProps {
  tabs: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const MorphingTabs = ({ tabs, value, onValueChange, className }: MorphingTabsProps) => {
  const [hoveredTab, setHoveredTab] = React.useState<string | null>(null);
  
  return (
    <div className={cn("relative flex gap-1 rounded-lg bg-muted/30 p-1", className)}>
      {tabs.map((tab) => {
        const isActive = value === tab.value;
        const isHovered = hoveredTab === tab.value;
        
        return (
          <button
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            onMouseEnter={() => setHoveredTab(tab.value)}
            onMouseLeave={() => setHoveredTab(null)}
            className={cn(
              "relative z-10 flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
            )}
            data-testid={`tab-${tab.value}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            
            {isActive && (
              <motion.div
                className="absolute inset-0 rounded-md bg-background shadow-sm"
                layoutId="activeTab"
                style={{ zIndex: -1 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            
            <motion.div
              className="absolute bottom-0 left-1/2 h-0.5 rounded-full"
              style={{
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))",
                transformOrigin: "center",
              }}
              initial={{ width: 0, x: "-50%" }}
              animate={{
                width: isActive ? "60%" : isHovered ? "30%" : 0,
                x: "-50%",
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 30,
              }}
            />
          </button>
        );
      })}
    </div>
  );
};

export { LiLoveTabs, LiLoveTabsList, LiLoveTabsTrigger, LiLoveTabsContent, MorphingTabs };
