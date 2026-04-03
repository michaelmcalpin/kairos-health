"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/utils/cn";

let toastCounter = 0;

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const typeConfig: Record<ToastType, { icon: React.ReactNode; borderColor: string; iconColor: string }> = {
  success: { icon: <CheckCircle size={18} />, borderColor: "border-l-green-500", iconColor: "text-green-400" },
  error: { icon: <AlertCircle size={18} />, borderColor: "border-l-red-500", iconColor: "text-red-400" },
  warning: { icon: <AlertTriangle size={18} />, borderColor: "border-l-yellow-500", iconColor: "text-yellow-400" },
  info: { icon: <Info size={18} />, borderColor: "border-l-blue-500", iconColor: "text-blue-400" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${Date.now()}-${++toastCounter}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const config = typeConfig[t.type];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-kairos-sm bg-kairos-card border border-kairos-border border-l-4 shadow-xl min-w-[300px] max-w-[420px] animate-fade-in",
                config.borderColor
              )}
            >
              <span className={config.iconColor}>{config.icon}</span>
              <p className="flex-1 text-sm font-body text-white">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-kairos-silver-dark hover:text-white transition-colors flex-shrink-0"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
