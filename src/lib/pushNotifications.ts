/**
 * Web Push & System Notification Manager for Ami Bachelor
 * Displays native notification bar alerts on Android (Chrome/PWA) and iOS (iOS 16.4+ Add to Home Screen PWA).
 */

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPushPermission(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await showPhonePushNotification(
        'Ami Bachelor Alerts Active',
        'You will now receive hostel announcements & meal alerts on your notification bar.'
      );
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return false;
  }
}

export async function showPhonePushNotification(title: string, body: string): Promise<void> {
  if (!isPushSupported()) return;

  try {
    if (Notification.permission !== 'granted') {
      return;
    }

    // Try service worker notification first (Required for background PWA on mobile)
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'showNotification' in registration) {
          await (registration as any).showNotification(title, {
            body,
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'ami-hostel-notice-' + Date.now(),
            renotify: true,
            data: { url: '/' }
          });
          return;
        }
      } catch (swErr) {
        console.warn('Service worker notification fallback to standard notification:', swErr);
      }
    }

    // Fallback standard browser notification
    new Notification(title, {
      body,
      icon: '/pwa-192x192.png'
    });
  } catch (err) {
    console.error('Error showing phone push notification:', err);
  }
}

