"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@radix-ui/react-toast";
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast
          key={id}
          {...props}
          className="glass border border-cyber-pink/20 text-white rounded-xl p-4 flex items-start gap-3"
        >
          <div className="flex-1">
            {title && <ToastTitle className="font-semibold">{title}</ToastTitle>}
            {description && <ToastDescription className="text-sm text-white/70">{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose className="text-white/40 hover:text-white" />
        </Toast>
      ))}
      <ToastViewport className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[380px] max-w-[90vw]" />
    </ToastProvider>
  );
}
