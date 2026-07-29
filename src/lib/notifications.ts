// Thin wrapper around the browser Notification API for itinerary reminders.

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function fireNotification(title: string, options?: NotificationOptions) {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      dir: "rtl",
      lang: "he",
      ...options,
    });
  } catch {
    // Some mobile browsers only allow notifications via a ServiceWorkerRegistration.
    navigator.serviceWorker?.getRegistration().then((reg) => {
      reg?.showNotification(title, {
        icon: "/icons/icon-192.png",
        dir: "rtl",
        lang: "he",
        ...options,
      });
    });
  }
}

/**
 * Schedules an in-memory timer that fires a reminder notification.
 * Returns a cancel function. Timers only live while the tab/app is open -
 * that's expected for a client-only PWA (true background push would need a
 * server + the Push API, wired through the same CloudAdapter once you swap
 * to Firebase Cloud Messaging or Supabase Edge Functions).
 */
export function scheduleReminder(
  eventTitle: string,
  eventTimeIso: string,
  minutesBefore: number,
  onFired: () => void
): () => void {
  const fireAt = new Date(eventTimeIso).getTime() - minutesBefore * 60_000;
  const delay = fireAt - Date.now();
  if (delay <= 0) return () => {};

  const timer = window.setTimeout(() => {
    fireNotification(`בעוד ${minutesBefore} דק' - ${eventTitle}`, {
      body: "טסים למיקונוס - תזכורת ללו״ז",
      tag: `reminder-${eventTitle}`,
    });
    onFired();
  }, delay);

  return () => window.clearTimeout(timer);
}
