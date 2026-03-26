"use client";

import React from "react";

interface ModalProps {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-2xl",
  lg: "max-w-4xl",
};

export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  size = "md",
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-6 sm:py-10">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm dark:bg-black/65"
        onClick={onClose}
      />
      <div className="relative flex min-h-full items-center justify-center">
        <div
          className={`relative w-full ${SIZE_CLASSES[size]} rounded-2xl border shadow-2xl`}
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b px-5 py-5 sm:px-6" style={{ borderColor: "var(--border)" }}>
            <div className="min-w-0">
              {title && <h2 className="text-xl font-semibold">{title}</h2>}
              {description && (
                <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-gray-50"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-muted)",
                backgroundColor: "transparent",
              }}
              aria-label="Close"
            >
              <span className="text-lg leading-none">&times;</span>
            </button>
          </div>
          <div className="max-h-[calc(100vh-9rem)] overflow-y-auto px-5 py-5 sm:px-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
