export type ProgressListener = (message: string, percent?: number) => void;

const listeners = new Set<ProgressListener>();

export function subscribe(listener: ProgressListener): () => void {
  listeners.add(listener);
  try {
    console.debug('[progressBus] subscribe: total listeners =', listeners.size);
  } catch {
    // 忽略错误
  }
  return () => {
    listeners.delete(listener);
    try {
      console.debug('[progressBus] unsubscribe: total listeners =', listeners.size);
    } catch {
      // 忽略错误
    }
  };
}

export function emit(message: string, percent?: number): void {
  try {
    console.debug('[progressBus] emit:', { message, percent, listeners: listeners.size });
  } catch {
    // 忽略错误
  }
  for (const l of listeners) {
    try {
      l(message, percent);
    } catch (e) {
      console.warn('[progressBus] listener error', e);
    }
  }
}
