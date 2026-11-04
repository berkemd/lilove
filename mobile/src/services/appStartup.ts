type StartupDependencies = {
  initIAP: () => Promise<unknown>;
  setupListeners: () => () => void;
  onError: (service: 'storekit' | 'listeners' | 'cleanup', error: unknown) => void;
};

/** Optional native services must not gate each other or outlive their listeners. */
export function startOptionalServices(dependencies: StartupDependencies): () => void {
  let active = true;
  let cleanupListeners: (() => void) | undefined;
  try {
    cleanupListeners = dependencies.setupListeners();
  } catch (error) {
    dependencies.onError('listeners', error);
  }

  const start = (service: 'storekit', initialize: () => Promise<unknown>) => {
    void Promise.resolve()
      .then(() => {
        if (active) return initialize();
      })
      .catch((error: unknown) => dependencies.onError(service, error));
  };
  start('storekit', dependencies.initIAP);

  return () => {
    if (!active) return;
    active = false;
    try {
      cleanupListeners?.();
    } catch (error) {
      dependencies.onError('cleanup', error);
    }
  };
}
