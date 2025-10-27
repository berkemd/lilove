import { apiRequest } from '@/lib/queryClient';

// VAPID public key (this should match the server's public key)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BKd0ZsgrdnoYyNnGcMwVzLKVDpKs_gcE9n7qMxQ5clqFMFRaj5HiT8OGJwQXfVDnNguTMRNHPKbVhpGvG6JQqwg';

export class PushNotificationService {
  private static instance: PushNotificationService;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscriptionJSON | null = null;

  private constructor() {}

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Check if push notifications are supported
  public isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Initialize push notifications
  public async initialize(): Promise<void> {
    if (!this.isSupported()) {
      console.log('Push notifications are not supported in this browser');
      return;
    }

    try {
      // Register service worker
      this.swRegistration = await this.registerServiceWorker();
      
      // Check current permission status
      const permission = Notification.permission;
      
      if (permission === 'granted') {
        // Subscribe to push notifications
        await this.subscribeToPush();
      }
      
      // Setup periodic sync for checking notifications
      if ('periodicSync' in this.swRegistration) {
        try {
          // @ts-ignore - periodicSync is still experimental
          await this.swRegistration.periodicSync.register('check-notifications', {
            minInterval: 60 * 60 * 1000 // Check every hour
          });
        } catch (error) {
          console.log('Periodic sync not available:', error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  // Register the service worker
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      
      console.log('Service Worker registered successfully:', registration);
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  // Request permission for notifications
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.log('Push notifications are not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await this.subscribeToPush();
    }
    
    return permission;
  }

  // Subscribe to push notifications
  private async subscribeToPush(): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service Worker not registered');
    }

    try {
      // Check if already subscribed
      let subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Subscribe to push notifications
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }
      
      this.subscription = subscription.toJSON();
      
      // Send subscription to server
      await this.sendSubscriptionToServer(this.subscription);
      
      console.log('Push subscription successful:', this.subscription);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Send subscription to server
  private async sendSubscriptionToServer(subscription: PushSubscriptionJSON): Promise<void> {
    try {
      await apiRequest('POST', '/api/notifications/subscribe', subscription);
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  public async unsubscribe(): Promise<void> {
    if (!this.swRegistration) {
      return;
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Notify server about unsubscription
        await apiRequest('POST', '/api/notifications/unsubscribe', { endpoint: subscription.endpoint });
        
        this.subscription = null;
        console.log('Unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      throw error;
    }
  }

  // Get current permission status
  public getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) {
      return 'denied';
    }
    return Notification.permission;
  }

  // Check if subscribed to push
  public async isSubscribed(): Promise<boolean> {
    if (!this.swRegistration) {
      return false;
    }
    
    const subscription = await this.swRegistration.pushManager.getSubscription();
    return !!subscription;
  }

  // Show a local notification
  public async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service Worker not registered');
    }

    if (Notification.permission !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    await this.swRegistration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      ...options
    });
  }

  // Test notification
  public async testNotification(): Promise<void> {
    await this.showNotification('LiLove Test', {
      body: 'Push notifications are working! 🎉',
      tag: 'test-notification',
      requireInteraction: false,
      data: {
        type: 'test',
        url: '/notifications'
      }
    });
  }

  // Convert VAPID key to Uint8Array
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Register background sync
  public async registerBackgroundSync(tag: string): Promise<void> {
    if (!this.swRegistration || !('sync' in this.swRegistration)) {
      console.log('Background sync not supported');
      return;
    }

    try {
      // @ts-ignore - sync is still experimental
      await this.swRegistration.sync.register(tag);
      console.log('Background sync registered:', tag);
    } catch (error) {
      console.error('Failed to register background sync:', error);
    }
  }

  // Queue notification for offline sending
  public async queueNotificationForSync(notification: any): Promise<void> {
    const cache = await caches.open('notification-queue');
    const request = new Request('/api/notifications', {
      method: 'POST',
      body: JSON.stringify(notification),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    await cache.put(request, new Response());
    await this.registerBackgroundSync('sync-notifications');
  }
}

// Export singleton instance
export const pushNotifications = PushNotificationService.getInstance();