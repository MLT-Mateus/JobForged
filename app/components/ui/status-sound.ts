"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { ToastKind } from "./AppToast";

const preferenceKey = "jf-status-sound-enabled";
const preferenceEvent = "jf-status-sound-preference";
let audioContext: AudioContext | null = null;
const soundFiles: Record<ToastKind, string> = {
  success: "/sounds/success.wav",
  info: "/sounds/info.wav",
  warning: "/sounds/warning.wav",
  danger: "/sounds/error.wav",
};
const soundBuffers = new Map<ToastKind, Promise<AudioBuffer>>();

function loadSound(context: AudioContext, kind: ToastKind) {
  let buffer = soundBuffers.get(kind);
  if (!buffer) {
    buffer = fetch(soundFiles[kind])
      .then((response) => {
        if (!response.ok) throw new Error(`Não foi possível carregar o som ${kind}.`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data))
      .catch((error: unknown) => {
        soundBuffers.delete(kind);
        throw error;
      });
    soundBuffers.set(kind, buffer);
  }
  return buffer;
}

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
  if (typeof window === "undefined" || !enabled() || !window.AudioContext) return;
  try {
    audioContext ??= new window.AudioContext();
    const context = audioContext;
    void context.resume().then(() => {
      return loadSound(context, kind).then((buffer) => {
        if (!enabled()) return;
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start();
      });
    }).catch(() => { /* Browsers may block audio before user interaction. */ });
  } catch { /* Sound must never interrupt the visual alert. */ }
}

/** Use for inline action results; loading labels must not call this hook with text. */
export function useStatusSoundForMessage(message: string, kind: ToastKind) {
  useEffect(() => {
    if (message) playStatusSound(kind);
  }, [message, kind]);
}
