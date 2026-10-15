"use client";

import { useSyncExternalStore } from "react";
import type { ToastKind } from "./AppToast";

const preferenceKey = "jf-status-sound-enabled";
const preferenceEvent = "jf-status-sound-preference";
let audioContext: AudioContext | null = null;

const notes: Record<ToastKind, ReadonlyArray<[number, number, number]>> = {
  success: [[523, 0, 0.12], [659, 0.11, 0.12], [784, 0.22, 0.18]],
  info: [[587, 0, 0.13], [784, 0.14, 0.13]],
  warning: [[587, 0, 0.15], [494, 0.19, 0.2]],
  danger: [[440, 0, 0.13], [349, 0.15, 0.18], [262, 0.33, 0.22]],
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
      for (const [frequency, offset, duration] of notes[kind]) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start + offset);
        gain.gain.linearRampToValueAtTime(0.035, start + offset + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, start + offset + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start + offset);
        oscillator.stop(start + offset + duration);
      }
    }).catch(() => { /* Browsers may block audio before user interaction. */ });
  } catch { /* Sound must never interrupt the visual alert. */ }
}
