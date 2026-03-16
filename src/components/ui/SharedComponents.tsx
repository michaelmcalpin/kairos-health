"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// LoadingSpinner Component
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} border-4 border-kairos-border border-t-kairos-gold rounded-full animate-spin`}
      />
    </div>
  );
}

// EmptyState Component
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  actionButton,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <Icon className="w-16 h-16 text-kairos-gold mb-4" />
      <h3 className="font-heading text-2xl text-kairos-gold mb-2">{title}</h3>
      <p className="font-body text-kairos-silver-dark text-center max-w-sm mb-8">
        {subtitle}
      </p>
      {actionButton && (
        <button
          onClick={actionButton.onClick}
          className="px-6 py-3 bg-kairos-gold text-kairos-card rounded-kairos-sm font-body font-medium hover:bg-yellow-500 transition-colors"
        >
          {actionButton.label}
        </button>
      )}
    </div>
  );
}

// Modal Component
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
      <div className="kairos-card bg-kairos-card border border-kairos-border rounded-kairos-sm p-8 max-w-md w-full mx-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-kairos-card-hover rounded-kairos-sm transition-colors"
        >
          <X className="w-5 h-5 text-kairos-silver-dark" />
        </button>

        <h2 className="font-heading text-2xl text-kairos-gold mb-6">{title}</h2>
        <div className="font-body text-kairos-silver-dark">{children}</div>
      </div>
    </div>
  );
}

// Toast Component
export function Toast({
  message,
  variant = "info",
  onDismiss,
}: {
  message: string;
  variant?: "success" | "error" | "info";
  onDismiss?: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  const variantClasses = {
    success: "bg-green-900 border-green-500 text-green-100",
    error: "bg-red-900 border-red-500 text-red-100",
    info: "bg-blue-900 border-blue-500 text-blue-100",
  };

  return (
    <div
      className={`fixed bottom-6 right-6 px-6 py-4 rounded-kairos-sm border ${variantClasses[variant]} font-body animate-fade-in z-40`}
    >
      {message}
    </div>
  );
}

// StatusBadge Component
export function StatusBadge({
  variant = "active",
  children,
}: {
  variant?: "active" | "inactive" | "pending" | "critical";
  children: React.ReactNode;
}) {
  const variantClasses = {
    active: "bg-green-900 text-green-100 border-green-500",
    inactive: "bg-gray-700 text-gray-300 border-gray-500",
    pending: "bg-yellow-900 text-yellow-100 border-yellow-500",
    critical: "bg-red-900 text-red-100 border-red-500",
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-body border ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
}
