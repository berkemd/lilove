interface Notification {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  userId?: string;
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
