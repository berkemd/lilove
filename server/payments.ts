export const paymentService = {
  createCheckout: async (userId: string, planId: string) => {
    return { checkoutUrl: "/payment-success" };
  },
  getSubscription: async (userId: string) => {
    return null;
  }
};
