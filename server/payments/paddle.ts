export async function createPaddleCheckout(userId: string, planId: string) {
  return { url: "/payment-success" };
}

export async function createPaddleCoinCheckout(userId: string, amount: number) {
  return { url: "/payment-success" };
}

export async function getPaddleSubscription(userId: string) {
  return null;
}

export async function cancelPaddleSubscription(subscriptionId: string) {
  return { success: true };
}
