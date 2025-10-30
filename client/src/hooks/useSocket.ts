import { useEffect, useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import type { Socket } from 'socket.io-client';
import { 
  initializeSocket, 
  disconnectSocket, 
  getSocket,
  NotificationEvent,
  TeamChatMessage,
  ChallengeUpdate,
  FriendActivityUpdate
} from '@/lib/socket';

export function useSocket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);

  useEffect(() => {
    if (!user) return;

    let socket: Socket | null = null;
    
    try {
      socket = initializeSocket(user.id);
    } catch (error) {
      console.error('Failed to initialize socket in useSocket:', error);
      return;
    }

    if (!socket) return;

    // Connection status
    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time notifications
    socket.on('notification', (notification: NotificationEvent) => {
      setNotifications(prev => [notification, ...prev]);
      
      // Show toast for important notifications
      if (notification.type === 'friend_request' || notification.type === 'team_invite') {
        toast({
          title: notification.title,
          description: notification.message,
        });
      }

      // Invalidate relevant queries
      switch (notification.type) {
        case 'friend_request':
          queryClient.invalidateQueries({ queryKey: ['/api/friends/requests'] });
          break;
        case 'team_invite':
          queryClient.invalidateQueries({ queryKey: ['/api/teams/invites'] });
          break;
        case 'challenge_update':
          queryClient.invalidateQueries({ queryKey: ['/api/challenges'] });
          break;
        case 'achievement':
          queryClient.invalidateQueries({ queryKey: ['/api/achievements'] });
          break;
      }
    });

    // Team chat messages
    socket.on('team_chat', (message: TeamChatMessage) => {
      // Update team chat in cache
      queryClient.setQueryData(
        [`/api/teams/${message.teamId}/chat`],
        (old: TeamChatMessage[] = []) => [...old, message]
      );
    });

    // Challenge live updates
    socket.on('challenge_update', (update: ChallengeUpdate) => {
      // Update challenge leaderboard in cache
      queryClient.setQueryData(
        [`/api/challenges/${update.challengeId}/leaderboard`],
        update.leaderboard
      );

      // Show notification for significant updates
      if (update.latestActivity && update.latestActivity.rank <= 3) {
        toast({
          title: "Challenge Update!",
          description: `${update.latestActivity.userName} is now rank #${update.latestActivity.rank}!`,
        });
      }
    });

    // Friend activity updates
    socket.on('friend_activity', (activity: FriendActivityUpdate) => {
      // Update social feed
      queryClient.invalidateQueries({ queryKey: ['/api/feed'] });
      
      // Update dashboard feed if visible
      queryClient.setQueryData(
        ['/api/feed'],
        (old: any[] = []) => [activity, ...old.slice(0, 19)]
      );
    });

    // Direct messages
    socket.on('direct_message', (message: any) => {
      // Update conversation cache
      queryClient.setQueryData(
        [`/api/messages/${message.senderId}`],
        (old: any[] = []) => [...old, message]
      );

      // Show notification
      toast({
        title: "New Message",
        description: `${message.senderName}: ${message.message.substring(0, 50)}...`,
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('notification');
      socket.off('team_chat');
      socket.off('challenge_update');
      socket.off('friend_activity');
      socket.off('direct_message');
    };
  }, [user, toast]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    getSocket()?.emit('mark_notification_read', notificationId);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    getSocket()?.emit('mark_all_notifications_read');
  }, []);

  return {
    socket: getSocket(),
    isConnected,
    notifications,
    unreadCount: notifications.filter(n => !n.read).length,
    markNotificationRead,
    clearNotifications
  };
}

// Hook for team-specific socket events
export function useTeamSocket(teamId: string | null) {
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState<{ userId: string; userName: string } | null>(null);

  useEffect(() => {
    if (!teamId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join team room
    socket.emit('join_team', teamId);

    // Listen for team messages
    socket.on(`team_message_${teamId}`, (message: TeamChatMessage) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for typing indicators
    socket.on(`team_typing_${teamId}`, (data: { userId: string; userName: string; isTyping: boolean }) => {
      if (data.isTyping) {
        setIsTyping({ userId: data.userId, userName: data.userName });
        setTimeout(() => setIsTyping(null), 3000);
      } else {
        setIsTyping(null);
      }
    });

    return () => {
      socket.emit('leave_team', teamId);
      socket.off(`team_message_${teamId}`);
      socket.off(`team_typing_${teamId}`);
    };
  }, [teamId]);

  const sendMessage = useCallback((message: string) => {
    if (!teamId) return;
    getSocket()?.emit('team_message', { teamId, message });
  }, [teamId]);

  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!teamId) return;
    getSocket()?.emit('team_typing', { teamId, isTyping });
  }, [teamId]);

  return {
    messages,
    isTyping,
    sendMessage,
    sendTypingIndicator
  };
}

// Hook for challenge-specific socket events
export function useChallengeSocket(challengeId: string | null) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);

  useEffect(() => {
    if (!challengeId) return;

    const socket = getSocket();
    if (!socket) return;

    // Join challenge room
    socket.emit('join_challenge', challengeId);

    // Listen for leaderboard updates
    socket.on(`challenge_leaderboard_${challengeId}`, (data: any[]) => {
      setLeaderboard(data);
    });

    // Listen for live activity
    socket.on(`challenge_activity_${challengeId}`, (activity: any) => {
      setLiveUpdates(prev => [activity, ...prev.slice(0, 9)]);
    });

    return () => {
      socket.emit('leave_challenge', challengeId);
      socket.off(`challenge_leaderboard_${challengeId}`);
      socket.off(`challenge_activity_${challengeId}`);
    };
  }, [challengeId]);

  return {
    leaderboard,
    liveUpdates
  };
}