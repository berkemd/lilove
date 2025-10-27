interface EventData {
  [key: string]: string | number | boolean | null | undefined;
}

export const analyticsService = {
  trackEvent: async (userId: string, event: string, data: EventData) => {
    console.log(`Analytics: ${event}`, data);
  },
  getStats: async (userId: string) => {
    return {};
  }
};
