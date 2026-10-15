"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ToastKind } from "./AppToast";

const preferenceKey = "jf-status-sound-enabled";
const preferenceEvent = "jf-status-sound-preference";
let audioContext: AudioContext | null = null;

type SoundPulse = { frequency: number; endFrequency?: number; offset: number; duration: number; level: number; wave?: OscillatorType };

// Short, restrained interface cues. No melodic arpeggios or sharp alarms.
const sounds: Record<ToastKind, ReadonlyArray<SoundPulse>> = {
  success: [{ frequency: 440, endFrequency: 493, offset: 0, duration: 0.18, level: 0.021 }],
  info: [{ frequency: 392, offset: 0, duration: 0.12, level: 0.017 }],
  warning: [
    { frequency: 330, offset: 0, duration: 0.09, level: 0.019 },
    { frequency: 330, offset: 0.15, duration: 0.09, level: 0.016 },
  ],
  danger: [{ frequency: 275, endFrequency: 235, offset: 0, duration: 0.2, level: 0.023, wave: "sine" }],
};

function enabled() {
  try { return window.localStorage.getItem(preferenceKey) !== "off"; }
  catch { return true; }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(preferenceEvent, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(preferenceEvent, callback);
  };
}

export function useStatusSoundPreference() {
  return useSyncExternalStore(subscribe, enabled, () => true);
}

export function setStatusSoundEnabled(value: boolean) {
  try { window.localStorage.setItem(preferenceKey, value ? "on" : "off"); }
  catch { /* Private browsing may block storage; the current sound remains usable. */ }
  window.dispatchEvent(new Event(preferenceEvent));
}

export function playStatusSound(kind: ToastKind) {
  if (!enabled() || !window.AudioContext) return;
  try {
    audioContext ??= new window.AudioContext();
    const context = audioContext;
    void context.resume().then(() => {
      const start = context.currentTime;
      for (const { frequency, endFrequency, offset, duration, level, wave } of sounds[kind]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const filter = context.createBiquadFilter();
        const at = start + offset;
        oscillator.type = wave ?? "triangle";
        oscillator.frequency.setValueAtTime(frequency, at);
        if (endFrequency) oscillator.frequency.linearRampToValueAtTime(endFrequency, at + duration);
        filter.type = "lowpass";
        filter.frequency.value = 950;
        filter.Q.value = 0.6;
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(level, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        oscillator.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        oscillator.start(at);
        oscillator.stop(at + duration + 0.01);
      }
    }).catch(() => { /* Browsers may block audio before user interaction. */ });
  } catch { /* Sound must never interrupt the visual alert. */ }
}

/** Use for inline action results; loading labels must not call this hook with text. */
export function useStatusSoundForMessage(message: string, kind: ToastKind) {
  useEffect(() => {
    if (message) playStatusSound(kind);
  }, [message, kind]);
}
