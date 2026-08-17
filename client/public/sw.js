// Service Worker for Push Notifications - LiLove

// Cache name for offline support
const CACHE_NAME = 'lilove-v1';
const urlsToCache = [
  '/',
  '/offline.html',
  '/notifications',
  '/settings'
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', event => {
  if (!event.data) return;

  let notification;
  try {
    notification = event.data.json();
  } catch (e) {
    notification = {
      title: 'LiLove',
      body: event.data.text(),
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png'
    };
  }

  const options = {
    body: notification.body || 'You have a new notification',
    icon: notification.icon || '/icon-192x192.png',
    badge: notification.badge || '/badge-72x72.png',
    vibrate: notification.vibrate || [200, 100, 200],
    tag: notification.tag || 'default',
    renotify: notification.renotify || false,
    silent: notification.silent || false,
    requireInteraction: notification.requireInteraction || false,
    timestamp: notification.timestamp || Date.now(),
    data: notification.data || {},
    actions: notification.actions || [],
    image: notification.image // Support for rich media notifications
  };

  // Add action buttons based on notification type
  switch (notification.type) {
    case 'task_reminder':
      options.actions = [
        { action: 'complete', title: 'Complete', icon: '/check-icon.png' },
        { action: 'snooze', title: 'Snooze 15 min', icon: '/clock-icon.png' }
      ];
      break;
    case 'friend_request':
      options.actions = [
        { action: 'accept', title: 'Accept', icon: '/check-icon.png' },
        { action: 'decline', title: 'Decline', icon: '/x-icon.png' }
      ];
      break;
    case 'achievement':
      options.actions = [
        { action: 'view', title: 'View Achievement', icon: '/trophy-icon.png' },
        { action: 'share', title: 'Share', icon: '/share-icon.png' }
      ];
      break;
    case 'team_invite':
      options.actions = [
        { action: 'join', title: 'Join Team', icon: '/users-icon.png' },
        { action: 'later', title: 'Decide Later', icon: '/clock-icon.png' }
      ];
      break;
    case 'streak_warning':
      options.actions = [
        { action: 'start', title: 'Start Now', icon: '/play-icon.png' },
        { action: 'remind', title: 'Remind in 1hr', icon: '/bell-icon.png' }
      ];
      break;
    default:
      options.actions = [
        { action: 'view', title: 'View', icon: '/eye-icon.png' }
      ];
  }

  event.waitUntil(
    self.registration.showNotification(notification.title || 'LiLove', options)
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  let responseUrl = '/';

  if (action === 'complete' && data.taskId) {
    // Complete the task
    fetch('/api/tasks/' + data.taskId + '/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    responseUrl = '/tasks';
  } else if (action === 'snooze' && data.taskId) {
    // Snooze the task reminder
    fetch('/api/tasks/' + data.taskId + '/snooze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minutes: 15 })
    });
  } else if (action === 'accept' && data.requestId) {
    // Accept friend request
    fetch('/api/friend-requests/' + data.requestId + '/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    responseUrl = '/teams';
  } else if (action === 'view' || !action) {
    // Default action - view the notification
    if (data.url) {
      responseUrl = data.url;
    } else if (data.type) {
      switch (data.type) {
        case 'task_reminder':
          responseUrl = '/tasks';
          break;
        case 'achievement':
          responseUrl = '/achievements';
          break;
        case 'friend_request':
        case 'team_invite':
          responseUrl = '/teams';
          break;
        case 'challenge_update':
          responseUrl = '/challenges';
          break;
        case 'goal_checkin':
          responseUrl = '/goals';
          break;
        case 'new_message':
          responseUrl = '/messages';
          break;
        case 'mentor_insight':
          responseUrl = '/coach';
          break;
        case 'level_up':
          responseUrl = '/gamification';
          break;
        case 'daily_digest':
        case 'weekly_report':
          responseUrl = '/analytics';
          break;
        default:
          responseUrl = '/notifications';
      }
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Check if there's already a window/tab open
        for (let client of windowClients) {
          if (client.url === responseUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(responseUrl);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', event => {
  const data = event.notification.data;
  
  // Track notification dismissal
  if (data && data.id) {
    fetch('/api/notifications/' + data.id + '/dismissed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {
      // Silently fail if tracking fails
    });
  }
});

// Background sync for offline notification sending
self.addEventListener('sync', event => {
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

async function syncNotifications() {
  try {
    const cache = await caches.open('notification-queue');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await fetch(request, {
          credentials: 'include' // Include auth cookies
        });
        if (response.ok) {
          await cache.delete(request);
        }
      } catch (error) {
        // Keep in cache to retry later
        console.log('Failed to sync notification:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

// Handle notification action responses
async function handleNotificationAction(action, data) {
  try {
    let response;
    switch (action) {
      case 'complete':
        if (data.taskId) {
          response = await fetch(`/api/tasks/${data.taskId}/complete`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;
      case 'snooze':
        if (data.taskId) {
          response = await fetch(`/api/tasks/${data.taskId}/snooze`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minutes: 15 })
          });
        }
        break;
      case 'accept':
        if (data.requestId) {
          response = await fetch(`/api/friend-requests/${data.requestId}/accept`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;
      case 'join':
        if (data.teamId) {
          response = await fetch(`/api/teams/${data.teamId}/join`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });
        }
        break;
    }
    
    if (response && !response.ok) {
      throw new Error(`Action failed: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error('Failed to handle notification action:', error);
    // Queue for retry
    const cache = await caches.open('notification-queue');
    const request = new Request('/api/notification-actions', {
      method: 'POST',
      body: JSON.stringify({ action, data }),
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(request, new Response());
  }
}

// Periodic background sync for checking new notifications
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-notifications') {
    event.waitUntil(checkForNewNotifications());
  }
});

async function checkForNewNotifications() {
  try {
    const response = await fetch('/api/notifications/check', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.hasNew) {
        self.registration.showNotification('LiLove', {
          body: `You have ${data.count} new notifications`,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'new-notifications',
          data: { url: '/notifications' },
          actions: [
            { action: 'view', title: 'View All', icon: '/eye-icon.png' },
            { action: 'dismiss', title: 'Dismiss', icon: '/x-icon.png' }
          ]
        });
      }
    }
  } catch (error) {
    console.error('Check notifications failed:', error);
  }
}