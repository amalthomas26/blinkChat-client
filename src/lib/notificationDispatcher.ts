import { browserNotificationService } from "../services/browserNotification.service";
import { useNotificationStore } from "../store/notification.store";
import { useAuthStore } from "../store/auth.store";
import type { CreateAppNotificationInput } from "../types";
import { AppNotificationKind } from "../types";



function playNotificationChime(): void {
  try {
    // Support Safari's prefixed AudioContext
    const AudioCtx =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Helper to create and schedule a sine oscillator
    const scheduleNote = (
      freq: number,
      startOffset: number,
      peakGain: number,
      decayEnd: number,
    ): void => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      // Ramp up quickly then exponential decay
      gain.gain.setValueAtTime(0, now + startOffset);
      gain.gain.linearRampToValueAtTime(peakGain, now + startOffset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decayEnd);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + decayEnd);
    };

    // D5  (587.33 Hz) — first note
    scheduleNote(587.33, 0,    0.16, 0.22);
    // F#5 (739.99 Hz) — second note, slightly overlapping
    scheduleNote(739.99, 0.14, 0.12, 0.38);

    // Release the AudioContext after both notes finish
    setTimeout(() => void ctx.close(), 500);
  } catch {
    // AudioContext unavailable or suspended — silently skip
  }
}

// ── Main dispatcher ─────────────────────────────────────────────────────────

export function dispatchAppNotification(
  input: CreateAppNotificationInput,
): void {
  const state = useNotificationStore.getState();

  // 1. Local quick-mute (isGlobalMuted from notification store)
  if (state.isGlobalMuted) return;

  // 2. Server-side muteAll pref — silences everything including in-app
  const notifPrefs = useAuthStore.getState().user?.notificationPrefs;
  if (notifPrefs?.muteAll) return;

  // Always add to the in-app notification centre
  const notification = state.addNotification(input);

  // 3. Chime — play for message notifications only (calls have a ringtone)
  //    Skipped when the user has turned off sounds in settings.
  const isCallKind =
    input.kind === AppNotificationKind.INCOMING_CALL ||
    input.kind === AppNotificationKind.MISSED_CALL;

  if (!isCallKind && notifPrefs?.sounds !== false) {
    playNotificationChime();
  }

  // 4. Browser (desktop) notification — only when tab is hidden AND
  //    the user hasn't turned off browserNotifications in settings
  const browserNotificationsEnabled = notifPrefs?.browserNotifications !== false;
  const tabIsHidden = document.hidden;

  if (tabIsHidden && browserNotificationsEnabled) {
    browserNotificationService.show({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      route: notification.route,
      icon: notification.avatarUrl,
      tag:
        notification.conversationId ?? notification.callId ?? notification.id,
      requireInteraction:
        notification.kind === AppNotificationKind.INCOMING_CALL,
    });
  }

  // Vibrate for calls regardless of browser notification setting
  if (isCallKind) {
    browserNotificationService.vibrate([80, 40, 80]);
  }
}

