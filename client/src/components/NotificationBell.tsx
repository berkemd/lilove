import { useState, useEffect } from 'react';
import { Bell, X, Check, Filter, Archive, AlertCircle, Target, Trophy, Users, Zap, MessageSquare, Calendar, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';

interface Notification {
  id: string;
  type: string;
  title: string;
  message?: string;
  category: string;
  priority: string;
  actionUrl?: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
  relatedGoalId?: string;
  relatedTaskId?: string;
  relatedUserId?: string;
  relatedTeamId?: string;
  relatedChallengeId?: string;
}

const notificationIcons: Record<string, any> = {
  task_reminder: Calendar,
  goal_checkin: Target,
  achievement: Trophy,
  friend_request: Users,
  team_invite: Users,
  challenge_update: Zap,
  streak_warning: AlertCircle,
  mentor_insight: MessageSquare,
  level_up: TrendingUp,
  new_message: MessageSquare,
  daily_digest: Calendar,
  weekly_report: TrendingUp,
};

const categoryColors: Record<string, string> = {
  social: 'bg-blue-500',
  achievements: 'bg-purple-500',
  reminders: 'bg-orange-500',
  system: 'bg-gray-500',
  engagement: 'bg-green-500',
};

export function NotificationBell({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();
  const { socket } = useSocket();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } = useQuery({
    queryKey: ['/api/notifications', selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      params.append('limit', '50');
      
      const response = await apiRequest(`/api/notifications?${params.toString()}`, {
        method: 'GET',
      });
      return await response.json() as Notification[];
    },
    enabled: !!user,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    queryFn: async () => {
      const response = await apiRequest('/api/notifications/unread-count', {
        method: 'GET',
      });
      return await response.json() as { count: number };
    },
    enabled: !!user,
  });

  const unreadCount = unreadData?.count || 0;

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notifications/read-all', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: 'All notifications marked as read',
      });
    },
  });

  // Clear notification mutation
  const clearNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Clear all notifications mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notifications', {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'All notifications cleared',
      });
    },
  });

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket || !user) return;

    // Safely authenticate with socket
    try {
      if (socket.connected) {
        socket.emit('authenticate', user.id);
      } else {
        // Wait for connection before authenticating
        socket.on('connect', () => {
          socket.emit('authenticate', user.id);
        });
      }
    } catch (error) {
      console.error('Socket authentication error:', error);
      // Continue without socket features
    }

    // Listen for new notifications
    const handleNewNotification = (notification: Notification) => {
      try {
        // Refetch notifications to get the new one
        refetchNotifications();
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
        
        // Show toast for high-priority notifications
        if (notification.priority === 'high' || notification.priority === 'urgent') {
          const Icon = notificationIcons[notification.type] || Bell;
          toast({
            title: notification.title,
            description: notification.message,
          });
        }
      } catch (error) {
        console.error('Error handling notification:', error);
      }
    };

    socket.on('notification', handleNewNotification);

    // Listen for notification updates
    socket.on('notification:read', (notificationId: string) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    });

    socket.on('notification:all-read', () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    });

    socket.on('notification:cleared', (notificationId: string) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    });

    socket.on('notification:all-cleared', () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    });

    socket.on('notification:unread-count', (count: number) => {
      queryClient.setQueryData(['/api/notifications/unread-count'], { count });
    });

    return () => {
      try {
        if (socket) {
          socket.off('notification', handleNewNotification);
          socket.off('notification:read');
          socket.off('notification:all-read');
          socket.off('notification:cleared');
          socket.off('notification:all-cleared');
          socket.off('notification:unread-count');
          socket.off('connect');
        }
      } catch (error) {
        console.error('Error cleaning up socket listeners:', error);
      }
    };
  }, [socket, user, refetchNotifications, toast]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    
    // Close popover if there's an action URL
    if (notification.actionUrl) {
      setOpen(false);
    }
  };

  const filteredNotifications = Array.isArray(notifications) ? notifications.filter(n => !n.isArchived) : [];

  const getNotificationIcon = (type: string) => {
    const Icon = notificationIcons[type] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500';
      case 'high':
        return 'text-orange-500';
      case 'low':
        return 'text-gray-400';
      default:
        return 'text-foreground';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative hover-elevate ${isMobile ? 'touch-target min-w-[44px] min-h-[44px]' : ''} ${className}`}
          data-testid="button-notifications"
        >
          <Bell className={`${isMobile ? 'h-5 w-5' : 'h-4 w-4'}`} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={`absolute -top-1 -right-1 ${isMobile ? 'h-6 w-6' : 'h-5 w-5'} p-0 flex items-center justify-center text-xs`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={`${isMobile ? 'w-[calc(100vw-2rem)] max-w-sm' : 'w-96'} p-0`}
        align="end"
        data-testid="notification-panel"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                className="h-7 text-xs"
                data-testid="button-mark-all-read"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            {filteredNotifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAllMutation.mutate()}
                className="h-7 text-xs"
                data-testid="button-clear-all"
              >
                <Archive className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
            <Link href="/notifications" onClick={() => setOpen(false)}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                data-testid="button-view-all"
              >
                View all
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-9 p-0 rounded-none border-b">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="social" className="text-xs">Social</TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs">Wins</TabsTrigger>
            <TabsTrigger value="reminders" className="text-xs">Tasks</TabsTrigger>
            <TabsTrigger value="engagement" className="text-xs">Activity</TabsTrigger>
            <TabsTrigger value="system" className="text-xs">System</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px]">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-1">
                  {selectedCategory === 'all' 
                    ? "You're all caught up!"
                    : `No ${selectedCategory} notifications`}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover-elevate cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-muted/30' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-2 rounded-lg ${categoryColors[notification.category]} bg-opacity-10`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${getPriorityColor(notification.priority)}`}>
                            {notification.title}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 -mt-1 -mr-1 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearNotificationMutation.mutate(notification.id);
                            }}
                            data-testid={`button-clear-${notification.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {notification.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                          {notification.priority === 'urgent' && (
                            <Badge variant="destructive" className="h-4 text-xs px-1">
                              Urgent
                            </Badge>
                          )}
                          {!notification.isRead && (
                            <span className="h-2 w-2 bg-primary rounded-full" />
                          )}
                        </div>
                        {notification.actionUrl && (
                          <Link href={notification.actionUrl}>
                            <Button
                              variant="link"
                              className="h-auto p-0 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View details →
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}