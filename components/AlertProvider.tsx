"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import Modal from "./Modal";

type AlertPayload = {
  title?: string;
  message: string;
};

type AlertContextValue = {
  showAlert: (message: string, title?: string) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertPayload | null>(null);

  const showAlert = (message: string, title?: string) => {
    setAlert({ message, title });
  };

  const value = useMemo(() => ({ showAlert }), []);

  return (
    <AlertContext.Provider value={value}>
      {children}
      <Modal
        open={!!alert}
        title={alert?.title || "Notice"}
        onClose={() => setAlert(null)}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {alert?.message}
          </p>
          <button
            type="button"
            onClick={() => setAlert(null)}
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
