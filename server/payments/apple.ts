export const appleIAPService = {
  verifyReceipt: async (receipt: string) => {
    return { valid: false };
  },
  processTransaction: async (userId: string, receipt: string) => {
    return { success: false };
  }
};
