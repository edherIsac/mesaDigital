import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Modal } from "../components/ui/modal";
import ToastContainer from "../components/ui/toast/ToastContainer";
import type { ToastAction } from "../components/ui/toast/Toast";

type Variant = "success" | "error" | "warning" | "info" | "default";

type ToastItem = {
  id: string;
  variant: Variant;
  title?: string;
  message: string;
  duration?: number | null; // null = persistent until dismissed
  actions?: ToastAction[];
};

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmRequest = {
  id: string;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (v: boolean) => void;
};

type AlertContextValue = {
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  show: (variant: Variant, message: string, title?: string, duration?: number | null, actions?: ToastAction[]) => string;
  dismiss: (id: string) => void;
  confirm: (message: string, opts?: ConfirmOptions) => Promise<boolean>;
};

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4500;

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [closingIds, setClosingIds] = useState<Record<string, boolean>>({});
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const push = useCallback((t: ToastItem) => {
    setToasts((prev) => [...prev, t]);
  }, []);

  const show = useCallback((variant: Variant, message: string, title?: string, duration: number | null = DEFAULT_DURATION, actions?: ToastAction[]) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    push({ id, variant, title, message, duration, actions });
    return id;
  }, [push]);

  const initiateDismiss = useCallback((id: string) => {
    setClosingIds((s) => ({ ...s, [id]: true }));
  }, []);

  const completeDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    setClosingIds((s) => {
      const next = { ...s };
      delete next[id];
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    initiateDismiss(id);
  }, [initiateDismiss]);

  const success = useCallback((message: string, title?: string, duration?: number) => show("success", message, title, duration ?? DEFAULT_DURATION), [show]);
  const error = useCallback((message: string, title?: string, duration?: number) => show("error", message, title, duration ?? DEFAULT_DURATION), [show]);
  const info = useCallback((message: string, title?: string, duration?: number) => show("info", message, title, duration ?? DEFAULT_DURATION), [show]);
  const warning = useCallback((message: string, title?: string, duration?: number) => show("warning", message, title, duration ?? DEFAULT_DURATION), [show]);

  const confirm = useCallback((message: string, opts?: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
      setConfirmReq({
        id,
        title: opts?.title,
        message,
        confirmLabel: opts?.confirmLabel ?? "Confirmar",
        cancelLabel: opts?.cancelLabel ?? "Cancelar",
        resolve,
      });
    });
  }, []);

  const handleConfirm = (ok: boolean) => {
    if (!confirmReq) return;
    try {
      confirmReq.resolve(ok);
    } finally {
      setConfirmReq(null);
    }
  };

  const ctx: AlertContextValue = {
    success,
    error,
    info,
    warning,
    show,
    dismiss,
    confirm,
  };

  return (
    <AlertContext.Provider value={ctx}>
      {children}

      <ToastContainer toasts={toasts} closingIds={closingIds} onRequestClose={initiateDismiss} onCloseComplete={completeDismiss} />

      {/* Confirm modal */}
      <Modal isOpen={!!confirmReq} onClose={() => handleConfirm(false)} className="max-w-[520px] p-6">
        {confirmReq && (
          <div className="flex flex-col">
            <div className="mb-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{confirmReq.title ?? "Confirmar"}</h3>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">{confirmReq.message}</div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleConfirm(false)}
                className="inline-flex items-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {confirmReq.cancelLabel}
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                {confirmReq.confirmLabel}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextValue => {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    // Fallback to a no-op implementation to avoid runtime crashes when the
    // hook is used outside an AlertProvider (useful during development/HMR).
    // Log a warning so developers can fix missing provider usage.
    // The fallback preserves the API shape but performs no UI actions.
    // NOTE: keep this lightweight and non-throwing so pages can render.
    // eslint-disable-next-line no-console
    console.warn("useAlert called outside AlertProvider — returning no-op stub.");
    const noopId = () => "";
    const stub: AlertContextValue = {
      success: (message: string, title?: string) => noopId(),
      error: (message: string, title?: string) => noopId(),
      info: (message: string, title?: string) => noopId(),
      warning: (message: string, title?: string) => noopId(),
      show: (variant: Variant, message: string, title?: string) => noopId(),
      dismiss: (_id: string) => {},
      confirm: (_message: string) => Promise.resolve(false),
    };
    return stub;
  }
  return ctx;
};

export default AlertContext;
