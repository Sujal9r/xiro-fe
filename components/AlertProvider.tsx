"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import Modal from "./Modal";

type AlertPayload = {
  title?: string;
  message: string;
  onClose?: () => void;
};

type AlertContextValue = {
  showAlert: (message: string, title?: string, onClose?: () => void) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertPayload | null>(null);

  const showAlert = (message: string, title?: string, onClose?: () => void) => {
    setAlert({ message, title, onClose });
  };

  const handleClose = () => {
    const onClose = alert?.onClose;
    setAlert(null);
    onClose?.();
  };

  const value = useMemo(() => ({ showAlert }), []);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <Modal
        open={!!alert}
        title={alert?.title || "Notice"}
        onClose={handleClose}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {alert?.message}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-lg py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            style={{ backgroundColor: "var(--accent-600)" }}
          >
            OK
          </button>
        </div>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return ctx;
}
