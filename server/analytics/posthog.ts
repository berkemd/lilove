export function initPostHog() {
  console.log("✅ PostHog initialized (stub)");
}

export function getPostHogClient() {
  return {
    capture: (event: any) => console.log("PostHog event:", event),
    identify: (userId: string, props: any) => console.log("PostHog identify:", userId, props),
    isFeatureEnabled: async (flag: string, userId?: string) => false
  };
}
