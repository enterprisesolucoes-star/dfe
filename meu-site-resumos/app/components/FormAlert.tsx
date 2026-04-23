"use client";

import { useEffect, useState } from "react";

interface FormAlertProps {
  message: string | string[];
  theme?: "light" | "dark";
  autoDismissMs?: number;
  onDismiss?: () => void;
}

export default function FormAlert({ message, theme = "light", autoDismissMs = 5000, onDismiss }: FormAlertProps) {
  const [visible, setVisible] = useState(true);
  const messages = Array.isArray(message) ? message : [message];

  useEffect(() => {
    if (autoDismissMs) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onDismiss) onDismiss();
      }, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  if (!visible) return null;

  return (
    <div className={`rounded-xl border p-4 shadow-sm transition-all ${
      theme === "dark" 
        ? "border-slate-800 bg-slate-900 text-slate-100" 
        : "border-blue-100 bg-blue-50 text-blue-900"
    }`}>
      <div className="flex flex-col gap-1">
        {messages.map((msg, i) => (
          <p key={i} className="text-sm font-medium">
            {msg}
          </p>
        ))}
      </div>
    </div>
  );
}
