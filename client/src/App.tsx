import './lib/i18n';
import { useEffect } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import logoUrl from '@/assets/logo.svg';
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationBell } from "@/components/NotificationBell";
import { pushNotifications } from "@/lib/pushNotifications";
import { initAnalytics, identifyUser } from "@/lib/analytics";
import { StructuredData } from "@/components/StructuredData";
import Dashboard from "@/pages/Dashboard";
import Goals from "@/pages/Goals";
import Tasks from "@/pages/Tasks";
import Habits from "@/pages/Habits";
import Teams from "@/pages/Teams";
import Challenges from "@/pages/Challenges";
import Coach from "@/pages/Coach";
import BetaCoach from "@/pages/BetaCoach";
import Insights from "@/pages/Insights";
import Analytics from "@/pages/Analytics";
import Achievements from "@/pages/Achievements";
import Leaderboard from "@/pages/Leaderboard";
import Leagues from "@/pages/Leagues";
import Gamification from "@/pages/Gamification";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Pricing from "@/pages/Pricing";
import Landing from "@/pages/Landing";
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import NotFound from "@/pages/not-found";
import NotificationCenter from "@/pages/NotificationCenter";
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentFailure from "@/pages/PaymentFailure";
import Avatar from "@/pages/Avatar";
import Quests from "@/pages/Quests";
import Shop from "@/pages/Shop";
import Privacy from "@/pages/legal/Privacy";
import Terms from "@/pages/legal/Terms";

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  // Initialize analytics on app load
  useEffect(() => {
    initAnalytics();
  }, []);

  // Identify user when authenticated
  useEffect(() => {
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        displayName: user.displayName,
        username: user.username,
        isPremium: user.subscriptionTier !== 'free',
        subscriptionTier: user.subscriptionTier,
        level: (user as any).currentLevel || 1,
        onboardingCompleted: user.onboardingCompleted,
      });
    }
  }, [user]);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (user) {
      // Initialize push notifications service
      pushNotifications.initialize().then(() => {
        console.log('Push notifications initialized');
        
        // Check if we need to request permission
        const permission = pushNotifications.getPermissionStatus();
        if (permission === 'default') {
          // We'll ask for permission after user interaction
          console.log('Push notifications permission not yet granted');
        }
      }).catch(error => {
        console.error('Failed to initialize push notifications:', error);
      });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 bg-primary rounded-lg animate-pulse mx-auto" />
          <p className="text-muted-foreground">Loading LiLove...</p>
        </div>
      </div>
    );
  }

  // Public routes that don't require authentication
  return (
    <Switch>
      <Route path="/pricing" component={Pricing} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/payment-failure" component={PaymentFailure} />
      <Route path="/auth" component={Auth} />
      <Route path="/legal/privacy" component={Privacy} />
      <Route path="/legal/terms" component={Terms} />
      <Route>
        {!user ? <Landing /> : user.onboardingCompleted ? <AuthenticatedRoutes /> : <Onboarding />}
      </Route>
    </Switch>
  );
}

function AuthenticatedRoutes() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Dynamic sidebar style based on device type
  const dynamicSidebarStyle = {
    "--sidebar-width": isMobile ? "16rem" : "18rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={dynamicSidebarStyle as React.CSSProperties}>
      <div className="flex mobile-vh-full w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0"> {/* min-w-0 prevents overflow */}
          <header className="flex items-center justify-between mobile-padding border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <SidebarTrigger 
                data-testid="button-sidebar-toggle" 
                className="touch-target flex-shrink-0"
              />
              <div className="flex items-center gap-2 min-w-0">
                <img 
                  src={logoUrl} 
                  alt="LiLove" 
                  className="w-6 h-6 sm:w-8 sm:h-8 object-contain flex-shrink-0" 
                />
                <h1 className="font-bold text-responsive-base hide-mobile truncate">
                  LiLove
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <span className="text-responsive-xs text-muted-foreground hide-mobile truncate max-w-[120px] sm:max-w-none">
                Welcome, {user?.displayName || user?.username}
              </span>
              <NotificationBell className="touch-target" />
              <LanguageSwitcher />
              <ThemeToggle className="touch-target" />
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-background relative">
            <div className={`${isMobile ? 'mobile-padding' : 'p-6'}`}>
              <Router />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/goals" component={Goals} />
      <Route path="/tasks" component={Tasks} />
      <Route path="/habits" component={Habits} />
      <Route path="/teams" component={Teams} />
      <Route path="/challenges" component={Challenges} />
      <Route path="/coach" component={Coach} />
      <Route path="/beta-coach" component={BetaCoach} />
      <Route path="/insights" component={Insights} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/achievements" component={Achievements} />
      <Route path="/leaderboard" component={Leaderboard} />
      <Route path="/leagues" component={Leagues} />
      <Route path="/gamification" component={Gamification} />
      <Route path="/avatar" component={Avatar} />
      <Route path="/quests" component={Quests} />
      <Route path="/shop" component={Shop} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/notifications" component={NotificationCenter} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/payment-failure" component={PaymentFailure} />
      <Route path="/legal/privacy" component={Privacy} />
      <Route path="/legal/terms" component={Terms} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Custom sidebar width for LiLove growth platform
const sidebarStyle = {
  "--sidebar-width": "16rem",       // 256px for clean navigation
  "--sidebar-width-icon": "4rem",   // default icon width
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <NotificationProvider>
            <StructuredData />
            <AuthenticatedApp />
            <Toaster />
          </NotificationProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}