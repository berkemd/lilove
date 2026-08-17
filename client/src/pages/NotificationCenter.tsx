import { useState } from 'react';
import { 
  Bell, 
  Filter, 
  Search, 
  Calendar, 
  Target, 
  Trophy, 
  Users, 
  Zap, 
  MessageSquare, 
  TrendingUp,
  AlertCircle,
  Archive,
  Check,
  CheckCheck,
  X,
  Settings2,
  Clock,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import { useSocket } from '@/hooks/useSocket';
import { useIsMobile } from '@/hooks/use-mobile';

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

const categoryInfo: Record<string, { label: string; color: string; bgColor: string }> = {
  social: { label: 'Social', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  achievements: { label: 'Achievements', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  reminders: { label: 'Reminders', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  system: { label: 'System', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  engagement: { label: 'Engagement', color: 'text-green-600', bgColor: 'bg-green-50' },
  goals: { label: 'Goals', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  tasks: { label: 'Tasks', color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
};

export default function NotificationCenter() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const socket = useSocket();

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery<Notification[]>({
    queryKey: ['/api/notifications', selectedCategory, showArchived],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }
      params.append('includeArchived', showArchived.toString());
      params.append('limit', '200');
      
      const response = await fetch(`/api/notifications?${params.toString()}`, {
        method: 'GET',
        credentials: 'include'
      });
      return response.json();
    },
    enabled: !!user,
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const promises = notificationIds.map(id => 
        apiRequest(`/api/notifications/${id}/read`, { method: 'POST' })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: 'Notifications marked as read',
      });
    },
  });

  // Clear notification mutation
  const clearNotificationMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      const promises = notificationIds.map(id =>
        apiRequest(`/api/notifications/${id}`, { method: 'DELETE' })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      setSelectedNotifications(new Set());
      toast({
        title: 'Notifications archived',
      });
    },
  });

  // Filter and sort notifications
  const filteredNotifications = notifications.filter(n => {
    if (searchTerm && !n.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (!n.message || !n.message.toLowerCase().includes(searchTerm.toLowerCase()))) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else { // priority
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      return (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
    }
  });

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt);
    let groupKey: string;
    
    if (isToday(date)) {
      groupKey = 'Today';
    } else if (isYesterday(date)) {
      groupKey = 'Yesterday';
    } else {
      groupKey = format(date, 'MMMM d, yyyy');
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  const getNotificationIcon = (type: string) => {
    const Icon = notificationIcons[type] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
      case 'high':
        return <Badge variant="default" className="text-xs bg-orange-500">High</Badge>;
      case 'low':
        return <Badge variant="secondary" className="text-xs">Low</Badge>;
      default:
        return null;
    }
  };

  const toggleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const selectAllVisible = () => {
    setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
  };

  const deselectAll = () => {
    setSelectedNotifications(new Set());
  };

  const handleBulkAction = (action: 'read' | 'archive') => {
    const ids = Array.from(selectedNotifications);
    if (ids.length === 0) return;

    if (action === 'read') {
      markAsReadMutation.mutate(ids);
    } else {
      clearNotificationMutation.mutate(ids);
    }
  };

  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    urgent: notifications.filter(n => n.priority === 'urgent' && !n.isRead).length,
    today: notifications.filter(n => isToday(new Date(n.createdAt))).length,
  };

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4" data-testid="page-notification-center">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Notification Center</h1>
            <p className="text-muted-foreground mt-1">
              Manage all your notifications in one place
            </p>
          </div>
          <Link href="/settings">
            <Button variant="outline">
              <Settings2 className="h-4 w-4 mr-2" />
              Notification Settings
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All notifications</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unread}</div>
              <p className="text-xs text-muted-foreground">Needs attention</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgent</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
              <p className="text-xs text-muted-foreground">High priority</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
              <p className="text-xs text-muted-foreground">Recent activity</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                    data-testid="input-search-notifications"
                  />
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="oldest">Oldest</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  {selectedNotifications.size > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {selectedNotifications.size} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('read')}
                        data-testid="button-bulk-read"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Mark as Read
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('archive')}
                        data-testid="button-bulk-archive"
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Archive
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={deselectAll}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={showArchived}
                      onCheckedChange={(checked) => setShowArchived(checked as boolean)}
                      id="show-archived"
                    />
                    <label htmlFor="show-archived" className="text-sm">
                      Show archived
                    </label>
                  </div>
                  
                  {filteredNotifications.length > 0 && selectedNotifications.size === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllVisible}
                    >
                      Select All
                    </Button>
                  )}
                </div>
              </div>
              
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="social">
                    <Users className="h-4 w-4 mr-1" />
                    Social
                  </TabsTrigger>
                  <TabsTrigger value="achievements">
                    <Trophy className="h-4 w-4 mr-1" />
                    Achievements
                  </TabsTrigger>
                  <TabsTrigger value="reminders">
                    <Calendar className="h-4 w-4 mr-1" />
                    Reminders
                  </TabsTrigger>
                  <TabsTrigger value="engagement">
                    <Zap className="h-4 w-4 mr-1" />
                    Engagement
                  </TabsTrigger>
                  <TabsTrigger value="system">
                    <Settings2 className="h-4 w-4 mr-1" />
                    System
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                  <p>Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No notifications found</p>
                  <p className="text-sm mt-2">
                    {searchTerm 
                      ? "Try adjusting your search terms"
                      : selectedCategory === 'all'
                        ? "You're all caught up!"
                        : `No ${selectedCategory} notifications`}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedNotifications).map(([date, notifications]) => (
                    <div key={date}>
                      <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-2">
                        {date}
                      </h3>
                      <div className="space-y-2">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`group relative rounded-lg border p-4 transition-colors ${
                              !notification.isRead ? 'bg-muted/30 border-primary/20' : ''
                            } ${notification.isArchived ? 'opacity-60' : ''} hover-elevate`}
                            data-testid={`notification-item-${notification.id}`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedNotifications.has(notification.id)}
                                onCheckedChange={() => toggleSelectNotification(notification.id)}
                                className="mt-1"
                              />
                              
                              <div className={`p-2 rounded-lg ${categoryInfo[notification.category].bgColor}`}>
                                <div className={categoryInfo[notification.category].color}>
                                  {getNotificationIcon(notification.type)}
                                </div>
                              </div>
                              
                              <div className="flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-medium">
                                        {notification.title}
                                      </h4>
                                      {getPriorityBadge(notification.priority)}
                                      {!notification.isRead && (
                                        <Badge variant="secondary" className="text-xs">
                                          New
                                        </Badge>
                                      )}
                                      {notification.isArchived && (
                                        <Badge variant="outline" className="text-xs">
                                          Archived
                                        </Badge>
                                      )}
                                    </div>
                                    {notification.message && (
                                      <p className="text-sm text-muted-foreground">
                                        {notification.message}
                                      </p>
                                    )}
                                  </div>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Settings2 className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuSeparator />
                                      {!notification.isRead && (
                                        <DropdownMenuItem
                                          onClick={() => markAsReadMutation.mutate([notification.id])}
                                        >
                                          <Check className="h-4 w-4 mr-2" />
                                          Mark as read
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        onClick={() => clearNotificationMutation.mutate([notification.id])}
                                      >
                                        <Archive className="h-4 w-4 mr-2" />
                                        Archive
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {categoryInfo[notification.category].label}
                                    </Badge>
                                  </div>
                                  
                                  {notification.actionUrl && (
                                    <Link href={notification.actionUrl}>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                      >
                                        View
                                        <ChevronRight className="h-3 w-3 ml-1" />
                                      </Button>
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}