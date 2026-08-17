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
  Coins,
  MessagesSquare,
  HeartHandshake
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  {
    titleKey: "nav.overview",
    url: "/",
    icon: BarChart3,
    badge: null
  },
  {
    titleKey: "nav.goals", 
    url: "/goals",
    icon: Target,
    badge: null
  },
  {
    titleKey: "nav.tasks",
    url: "/tasks", 
    icon: CheckSquare,
    badge: null
  },
  {
    titleKey: "nav.habits",
    url: "/habits",
    icon: Flame,
    badge: null
  },
  {
    titleKey: "nav.teams",
    url: "/teams",
    icon: Users,
    badge: null
  },
  {
    titleKey: "nav.community",
    url: "/community",
    icon: MessagesSquare,
    badge: null
  },
  {
    titleKey: "nav.challenges",
    url: "/challenges",
    icon: Swords,
    badge: null
  },
  {
    titleKey: "nav.coach",
    url: "/coach",
    icon: Brain,
    badge: null
  },
  {
    titleKey: "nav.analytics",
    url: "/analytics",
    icon: TrendingUp,
    badge: null
  },
  {
    titleKey: "nav.achievements",
    url: "/achievements", 
    icon: Award,
    badge: null
  },
  {
    titleKey: "nav.leaderboard",
    url: "/leaderboard",
    icon: Trophy,
    badge: null
  },
  {
    titleKey: "nav.leagues",
    url: "/leagues",
    icon: Trophy,
    badge: null
  },
  {
    titleKey: "nav.gamification",
    url: "/gamification",
    icon: Gamepad2,
    badge: null
  },
  {
    titleKey: "nav.avatar",
    url: "/avatar",
    icon: UserCircle,
    badge: null
  },
  {
    titleKey: "nav.quests",
    url: "/quests",
    icon: Scroll,
    badge: null
  },
  {
    titleKey: "nav.shop",
    url: "/shop",
    icon: ShoppingBag,
    badge: null
  },
  {
    titleKey: "nav.therapists",
    url: "/therapists",
    icon: HeartHandshake,
    badge: null
  }
];

const bottomNavigation = [
  {
    titleKey: "nav.pricing",
    url: "/pricing",
    icon: CreditCard
  },
  {
    titleKey: "nav.profile",
    url: "/profile",
    icon: User
  },
  {
    titleKey: "nav.settings", 
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
        {user && (
          <SidebarHeader className="px-4 py-3 border-b">
            <Link href="/gamification" className="block hover-elevate rounded-md p-2 transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-yellow-500/10 rounded-md">
                    <Coins className="w-4 h-4 text-yellow-500" />
                  </div>
                  <span className="text-sm font-medium">Rewards</span>
                </div>
                <Badge variant="secondary" className="font-bold" data-testid="badge-level">
                  Lvl {user.currentLevel || 1}
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
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace('/', '') || 'overview'}`}
                    className={`${isMobile ? 'min-h-[44px] px-3' : 'min-h-[40px] px-4'} touch-target hover-elevate transition-colors`}
                  >
                    <Link href={item.url}>
                      <item.icon className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                      <span className={`${isMobile ? 'text-sm' : 'text-sm'} truncate`}>
                        {t(item.titleKey)}
                      </span>
                      {item.badge && (
                        <Badge 
                          variant="secondary" 
                          className={`ml-auto ${isMobile ? 'text-xs px-1.5 py-0.5' : 'text-xs'} flex-shrink-0`}
                          data-testid={`badge-${item.url.replace('/', '')}`}
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
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace('/', '')}`}
                    className={`${isMobile ? 'min-h-[44px] px-3' : 'min-h-[40px] px-4'} touch-target hover-elevate transition-colors`}
                  >
                    <Link href={item.url}>
                      <item.icon className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} flex-shrink-0`} />
                      <span className={`${isMobile ? 'text-sm' : 'text-sm'} truncate`}>
                        {t(item.titleKey)}
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