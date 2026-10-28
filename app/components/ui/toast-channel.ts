import type { ToastNotice } from './AppToast';

export type ActiveToast = { owner: string; serial: number; notice: ToastNotice };

/** One feedback surface for the entire page, including nested dialogs. */
export class ToastChannel {
  private active: ActiveToast | null = null;
  private serial = 0;
  private listeners = new Set<() => void>();
  private closers = new Map<string, () => void>();
  getSnapshot = () => this.active;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  registerClose(owner: string, close: () => void) {
    this.closers.set(owner, close);
    return () => { if (this.closers.get(owner) === close) this.closers.delete(owner); };
  }
  publish(owner: string, notice: ToastNotice) {
    const previous = this.active;
    this.active = { owner, notice, serial: ++this.serial };
    this.emit();
    if (previous && previous.owner !== owner) this.closers.get(previous.owner)?.();
  }
  release(owner: string) {
    if (this.active?.owner !== owner) return;
    this.active = null; this.emit();
  }
  dismiss(serial: number) {
    if (this.active?.serial !== serial) return;
    const owner = this.active.owner;
    this.active = null; this.emit();
    this.closers.get(owner)?.();
  }
  private emit() { this.listeners.forEach(listener => listener()); }
}

export const toastChannel = new ToastChannel();
