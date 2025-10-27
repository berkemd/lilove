import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader
} from "@/components/ui/sidebar";
import { 
  BarChart3, 
  Target, 
  CheckSquare,
  Flame,
  Brain, 
  TrendingUp, 
  Trophy,
  Award,
  Settings,
  User,
  CreditCard,
  Users,
  Swords,
  UserPlus,
  Gamepad2,
  UserCircle,
  Scroll,
  ShoppingBag,
  Coins
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  {
    title: "Overview",
    url: "/",
    icon: BarChart3,
    badge: null
  },
  {
    title: "Goals", 
    url: "/goals",
    icon: Target,
    badge: null
  },
  {
    title: "Tasks",
    url: "/tasks", 
    icon: CheckSquare,
    badge: "5" // Dynamic task count
  },
  {
    title: "Habits",
    url: "/habits",
    icon: Flame,
    badge: "NEW"
  },
  {
    title: "Teams",
    url: "/teams",
    icon: Users,
    badge: "NEW"
  },
  {
    title: "Challenges",
    url: "/challenges",
    icon: Swords,
    badge: "3 Active"
  },
  {
    title: "AI Coach",
    url: "/coach",
    icon: Brain,
    badge: null
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: TrendingUp,
    badge: null
  },
  {
    title: "Achievements",
    url: "/achievements", 
    icon: Award,
    badge: "3" // New achievements
  },
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: Trophy,
    badge: null
  },
  {
    title: "Leagues",
    url: "/leagues",
    icon: Trophy,
    badge: "NEW"
  },
  {
    title: "Gamification",
    url: "/gamification",
    icon: Gamepad2,
    badge: "NEW"
  },
  {
    title: "Avatar",
    url: "/avatar",
    icon: UserCircle,
    badge: "NEW"
  },
  {
    title: "Quests",
    url: "/quests",
    icon: Scroll,
    badge: "RPG"
  },
  {
    title: "Shop",
    url: "/shop",
    icon: ShoppingBag,
    badge: null
  }
];

const bottomNavigation = [
  {
    title: "Pricing",
    url: "/pricing",
    icon: CreditCard
  },
  {
    title: "Profile",
    url: "/profile",
    icon: User
  },
  {
    title: "Settings", 
    url: "/settings",
    icon: Settings
  }
];

export function AppSidebar() {
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <Sidebar data-testid="sidebar-main" className="border-r">
      <SidebarContent className="gap-2">
        {/* Coin Balance Header */}
        {user?.coinBalance !== undefined && (
          <SidebarHeader className="px-4 py-3 border-b">
            <Link href="/pricing?tab=coins" className="block hover-elevate rounded-md p-2 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-yellow-500/10 rounded-md">
                    <Coins className="w-4 h-4 text-yellow-500" />
                  </div>
                  <span className="text-sm font-medium">Coins</span>
                </div>
                <Badge variant="secondary" className="font-bold" data-testid="badge-coin-balance">
                  {user.coinBalance}
                </Badge>
              </div>
            </Link>
          </SidebarHeader>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={`${isMobile ? 'text-sm' : 'text-base'} font-bold text-primary`}>
            LiLove
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                    className={`${isMobile ? 'min-h-[44px] px-3' : 'min-h-[40px] px-4'} touch-target hover-elevate transition-colors`}
                  >
                    <Link href={item.url}>
                      <item.icon className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                      <span className={`${isMobile ? 'text-sm' : 'text-sm'} truncate`}>
                        {t(`nav.${item.title.toLowerCase()}`)}
                      </span>
                      {item.badge && (
                        <Badge 
                          variant="secondary" 
                          className={`ml-auto ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs'} flex-shrink-0`}
                          data-testid={`badge-${item.title.toLowerCase()}`}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Bottom Navigation */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {bottomNavigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                    className={`${isMobile ? 'min-h-[44px] px-3' : 'min-h-[40px] px-4'} touch-target hover-elevate transition-colors`}
                  >
                    <Link href={item.url}>
                      <item.icon className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                      <span className={`${isMobile ? 'text-sm' : 'text-sm'} truncate`}>
                        {t(`nav.${item.title.toLowerCase()}`)}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}