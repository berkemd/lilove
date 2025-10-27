import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Bell, Trophy, Flame, Target, CheckCircle2 } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'achievement' | 'reminder' | 'streak' | 'goal' | 'success';
  icon?: ReactNode;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored notifications:', e);
      }
    }
  }, []);

  // Save to localStorage whenever notifications change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Check for daily reminders
  useEffect(() => {
    const checkDailyReminders = () => {
      const now = new Date();
      const lastCheck = localStorage.getItem('lastNotificationCheck');
      const lastCheckDate = lastCheck ? new Date(lastCheck) : null;
      
      if (!lastCheckDate || lastCheckDate.toDateString() !== now.toDateString()) {
        // Morning motivation
        if (now.getHours() === 9 && now.getMinutes() === 0) {
          addNotification({
            title: 'Good Morning!',
            message: 'Ready to tackle your goals today? Your future self will thank you!',
            type: 'reminder',
          });
        }
        
        // Evening check-in
        if (now.getHours() === 20 && now.getMinutes() === 0) {
          addNotification({
            title: 'Evening Check-in',
            message: 'How did today go? Remember to log your progress!',
            type: 'reminder',
          });
        }
        
        localStorage.setItem('lastNotificationCheck', now.toISOString());
      }
    };

    checkDailyReminders();
    const interval = setInterval(checkDailyReminders, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'achievement':
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 'reminder':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'streak':
        return <Flame className="h-4 w-4 text-orange-500" />;
      case 'goal':
        return <Target className="h-4 w-4 text-purple-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return null;
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
      icon: notification.icon || getIcon(notification.type),
    };

    setNotifications((prev) => [newNotification, ...prev]);
    
    // Show toast for important notifications
    if (notification.type === 'achievement' || notification.type === 'streak') {
      toast({
        title: notification.title,
        description: notification.message,
      });
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}