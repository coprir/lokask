"use client";

import { useState, useCallback } from "react";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: React.ReactNode;
}

let globalToasts: Toast[] = [];
let listeners: Array<(toasts: Toast[]) => void> = [];

function dispatch(toast: Toast) {
  globalToasts = [...globalToasts, toast];
  listeners.forEach((l) => l(globalToasts));
  setTimeout(() => {
    globalToasts = globalToasts.filter((t) => t.id !== toast.id);
    listeners.forEach((l) => l(globalToasts));
  }, 5000);
}

export function toast(props: Omit<Toast, "id">) {
  dispatch({ ...props, id: Math.random().toString(36).slice(2) });
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(globalToasts);
  const subscribe = useCallback(() => {
    const listener = (t: Toast[]) => setToasts([...t]);
    listeners.push(listener);
    return () => { listeners = listeners.filter((l) => l !== listener); };
  }, []);
  useState(subscribe);
  return { toasts, toast };
}
