export const analyticsService = {
  trackEvent: async (userId: string, event: string, data: any) => {
    console.log(`Analytics: ${event}`, data);
  },
  getStats: async (userId: string) => {
    return {};
  }
};
