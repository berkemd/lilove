interface Notification {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'goal_checkin' | 'task_reminder' | 'achievement' | 'friend_request' | 'team_invite' | 'challenge_update' | 'streak_warning' | 'level_up';
  userId?: string;
  category?: string;
  priority?: string;
  relatedEntityIds?: Record<string, string>;
  actionUrl?: string;
}

export const notificationService = {
  send: async (userId: string, notification: Notification) => {
    console.log("Notification sent:", notification);
  },
  getNotifications: async (userId: string) => {
    return [];
  },
  createNotification: async (notification: Notification) => {
    console.log("Notification created:", notification);
    return { id: "notif-1", ...notification };
  }
};
