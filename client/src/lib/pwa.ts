/**
 * Service Worker Registration Utility
 * Registers and manages the service worker for PWA capabilities
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser');
    return null;
  }

  try {
    // Register the service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('Service Worker registered successfully:', registration.scope);

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New service worker available');
            
            // Notify user about update
            if (window.confirm('A new version is available. Reload to update?')) {
              window.location.reload();
            }
          }
        });
      }
    });

    // Handle controller change (when new service worker takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service worker controller changed');
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const unregistered = await registration.unregister();
    console.log('Service Worker unregistered:', unregistered);
    return unregistered;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if app is running in standalone mode (installed as PWA)
 */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if app is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function addConnectivityListeners(
  onOnline?: () => void,
  onOffline?: () => void
): () => void {
  const handleOnline = () => {
    console.log('App is now online');
    onOnline?.();
  };

  const handleOffline = () => {
    console.log('App is now offline');
    onOffline?.();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persisted();
    
    if (!isPersisted) {
      const granted = await navigator.storage.persist();
      console.log('Persistent storage granted:', granted);
      return granted;
    }
    
    return true;
  } catch (error) {
    console.error('Error requesting persistent storage:', error);
    return false;
  }
}

/**
 * Get storage estimate
 */
export async function getStorageEstimate(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
} | null> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return null;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;

    return {
      usage,
      quota,
      percentage,
    };
  } catch (error) {
    console.error('Error getting storage estimate:', error);
    return null;
  }
}

/**
 * Send message to service worker
 */
export function sendMessageToServiceWorker(message: any): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject(new Error('No service worker controller'));
      return;
    }

    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };

    navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);
  });
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('All caches cleared');
    return true;
  } catch (error) {
    console.error('Error clearing caches:', error);
    return false;
  }
}

/**
 * Initialize PWA features
 */
export async function initializePWA(): Promise<void> {
  // Register service worker
  const registration = await registerServiceWorker();
  
  if (registration) {
    // Request persistent storage
    await requestPersistentStorage();
    
    // Log storage estimate
    const estimate = await getStorageEstimate();
    if (estimate) {
      console.log(
        `Storage: ${(estimate.usage / 1024 / 1024).toFixed(2)}MB / ${(estimate.quota / 1024 / 1024).toFixed(2)}MB (${estimate.percentage.toFixed(2)}%)`
      );
    }
  }
}

export default {
  registerServiceWorker,
  unregisterServiceWorker,
  isStandalone,
  isOnline,
  addConnectivityListeners,
  requestPersistentStorage,
  getStorageEstimate,
  sendMessageToServiceWorker,
  clearAllCaches,
  initializePWA,
};
