export const notificationService = {
  send: async (userId: string, notification: any) => {
    console.log("Notification sent:", notification);
  },
  getNotifications: async (userId: string) => {
    return [];
  },
  createNotification: async (notification: any) => {
    console.log("Notification created:", notification);
    return { id: "notif-1", ...notification };
  }
};
