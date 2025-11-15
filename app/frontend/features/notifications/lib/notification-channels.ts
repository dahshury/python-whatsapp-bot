type DesktopNotificationPayload = {
  title: string;
  body: string;
  tag?: string;
};

// Audio notification constants
const NOTIFICATION_FREQUENCY_HZ = 880; // A5 note frequency
const NOTIFICATION_GAIN = 0.05; // Volume level (0.0 to 1.0)
const NOTIFICATION_DURATION_SECONDS = 0.25; // Duration in seconds

let sharedAudioContext: AudioContext | null = null;
let emailPlaceholderWarned = false;

export function playNotificationChime(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const audioCtor =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!audioCtor) {
      return;
    }
    sharedAudioContext = sharedAudioContext ?? new audioCtor();
    const ctx = sharedAudioContext;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = NOTIFICATION_FREQUENCY_HZ;
    gain.gain.value = NOTIFICATION_GAIN;
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + NOTIFICATION_DURATION_SECONDS);
  } catch {
    // Ignore audio errors
  }
}

export async function showDesktopNotification(
  payload: DesktopNotificationPayload
): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }
  if (!("Notification" in window)) {
    return;
  }
  if (
    typeof document !== "undefined" &&
    document.visibilityState === "visible"
  ) {
    // Avoid duplicating on-screen toast with a desktop banner when the tab is active
    return;
  }
  const display = () => {
    try {
      new Notification(payload.title, {
        body: payload.body,
        ...(payload.tag !== undefined && { tag: payload.tag }),
      });
    } catch {
      // ignored
    }
  };
  if (Notification.permission === "granted") {
    display();
    return;
  }
  if (Notification.permission === "denied") {
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      display();
    }
  } catch {
    // request permission failed
  }
}

export function sendEmailNotificationPlaceholder(_eventSummary: string): void {
  if (emailPlaceholderWarned) {
    return;
  }
  emailPlaceholderWarned = true;
  // Email notification placeholder - implementation pending
}
