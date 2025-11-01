export function initPostHog() {
  console.log("✅ PostHog initialized (stub)");
}

export function getPostHogClient() {
  return {
    capture: (event: any) => console.log("PostHog event:", event),
    identify: (options: { distinctId: string; properties?: any } | string, props?: any) => {
      if (typeof options === 'string') {
        console.log("PostHog identify:", options, props);
      } else {
        console.log("PostHog identify:", options.distinctId, options.properties);
      }
    },
    isFeatureEnabled: async (flag: string, userId?: string) => false
  };
}
