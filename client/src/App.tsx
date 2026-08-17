import './lib/i18n';
import { useState, useEffect, lazy, Suspense } from 'react';
import { Switch, Route } from "wouter";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { queryClient, initCsrfToken } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import { FirebaseAuthProvider } from "@/contexts/FirebaseAuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import appIconUrl from '@/assets/app-icon.png';
import { NotificationProvider } from "@/contexts/NotificationContext";
import { NotificationBell } from "@/components/NotificationBell";
import { pushNotifications } from "@/lib/pushNotifications";
import { initAnalytics, identifyUser } from "@/lib/analytics";
import { StructuredData } from "@/components/StructuredData";
import { SplashScreen } from "@/components/SplashScreen";
import { LoadingSpinner, LoadingPage } from "@/components/LoadingSpinner";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { FloatingChatContainer } from "@/components/chat";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Coach = lazy(() => import("@/pages/Coach"));
const BetaCoach = lazy(() => import("@/pages/BetaCoach"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Insights = lazy(() => import("@/pages/Insights"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const Teams = lazy(() => import("@/pages/Teams"));
const Challenges = lazy(() => import("@/pages/Challenges"));
const Profile = lazy(() => import("@/pages/Profile"));
const Gamification = lazy(() => import("@/pages/Gamification"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const Leagues = lazy(() => import("@/pages/Leagues"));
const Shop = lazy(() => import("@/pages/Shop"));
const Quests = lazy(() => import("@/pages/Quests"));
const Wellness = lazy(() => import("@/pages/Wellness"));
const SafetyResources = lazy(() => import("@/pages/SafetyResources"));
const Community = lazy(() => import("@/pages/Community"));
const Therapists = lazy(() => import("@/pages/Therapists"));
const GrowthSanctuary = lazy(() => import("@/pages/GrowthSanctuary"));

import Goals from "@/pages/Goals";
import Tasks from "@/pages/Tasks";
import Habits from "@/pages/Habits";
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
import Marketplace from "@/pages/Marketplace";
import Privacy from "@/pages/legal/Privacy";
import Terms from "@/pages/legal/Terms";
import AuthCallback from "@/pages/AuthCallback";

function LoadingFallback() {
  return (
    <LoadingPage message="Loading..." />
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  // Initialize analytics and CSRF protection on app load
  useEffect(() => {
    initAnalytics();
    initCsrfToken();
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
      <div className="flex items-center justify-center min-h-screen bg-background brand-gradient-bg">
        <div className="text-center space-y-4">
          <AnimatedLogo size={80} showText animate />
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
      <Route path="/auth/callback" component={AuthCallback} />
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
                  src={appIconUrl} 
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
      <FloatingChatContainer 
        coachName="Lila" 
        onSendMessage={async (message: string) => {
          const res = await fetch('/api/ai-coach/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message }),
          });
          if (!res.ok) throw new Error('Failed to send message');
          const data = await res.json();
          return {
            response: data.response || data.message,
            suggestions: data.suggestions || [],
          };
        }}
      />
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingFallback />}>
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
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/quests" component={Quests} />
        <Route path="/shop" component={Shop} />
        <Route path="/wellness" component={Wellness} />
        <Route path="/safety-resources" component={SafetyResources} />
        <Route path="/community" component={Community} />
        <Route path="/therapists" component={Therapists} />
        <Route path="/growth-sanctuary" component={GrowthSanctuary} />
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
    </Suspense>
  );
}

// Custom sidebar width for LiLove growth platform
const sidebarStyle = {
  "--sidebar-width": "16rem",       // 256px for clean navigation
  "--sidebar-width-icon": "4rem",   // default icon width
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('lilove-splash-seen');
    if (hasSeenSplash) {
      setShowSplash(false);
      setAppReady(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('lilove-splash-seen', 'true');
    setShowSplash(false);
    setAppReady(true);
  };

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <FirebaseAuthProvider>
            <NotificationProvider>
              {showSplash ? (
                <SplashScreen onComplete={handleSplashComplete} minDisplayTime={2500} />
              ) : (
                <>
                  <StructuredData />
                  <AuthenticatedApp />
                  <Toaster />
                </>
              )}
            </NotificationProvider>
          </FirebaseAuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}