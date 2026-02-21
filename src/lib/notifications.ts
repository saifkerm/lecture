export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return "denied";
  }
  return Notification.requestPermission();
}

type ReminderOptions = {
  enabled: boolean;
  timeHHmm: string;
  title?: string;
  body?: string;
};

function parseReminderTime(timeHHmm: string): { hour: number; minute: number } {
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(timeHHmm)) {
    return { hour: 21, minute: 0 };
  }

  const [hourRaw, minuteRaw] = timeHHmm.split(":");
  return {
    hour: Number(hourRaw),
    minute: Number(minuteRaw)
  };
}

export function scheduleDailyReminder(options: ReminderOptions): () => void {
  if (!options.enabled || !isNotificationSupported() || Notification.permission !== "granted") {
    return () => undefined;
  }

  const { hour, minute } = parseReminderTime(options.timeHHmm);
  const title = options.title ?? "Rappel Ramadan";
  const body =
    options.body ?? "Prenez un moment pour écouter votre partie du jour et mettre à jour votre suivi.";

  let timeoutId: number | null = null;

  const scheduleNext = (): void => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(hour, minute, 0, 0);

    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + 1);
    }

    const delay = next.getTime() - now.getTime();
    timeoutId = window.setTimeout(() => {
      if (Notification.permission === "granted") {
        // Browser-level notification for daily reminder while app context is active.
        new Notification(title, { body });
      }
      scheduleNext();
    }, delay);
  };

  scheduleNext();

  return () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  };
}
