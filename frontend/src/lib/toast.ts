export type Toast = { id: number; kind: 'success' | 'error' | 'info'; text: string };

export const toastBus = new EventTarget();
let seq = 0;

export function toast(text: string, kind: Toast['kind'] = 'success') {
  toastBus.dispatchEvent(new CustomEvent('toast', { detail: { id: ++seq, kind, text } }));
}
