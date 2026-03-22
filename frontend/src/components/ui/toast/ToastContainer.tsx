import React from 'react';
import Toast, { ToastAction } from './Toast';

type Variant = 'success' | 'error' | 'warning' | 'info' | 'default';

export type ToastItem = {
  id: string;
  variant: Variant;
  title?: string;
  message: string;
  duration?: number | null;
  actions?: ToastAction[];
};

interface Props {
  toasts: ToastItem[];
  closingIds: Record<string, boolean>;
  onRequestClose: (id: string) => void;
  onCloseComplete: (id: string) => void;
}

const ToastContainer: React.FC<Props> = ({ toasts, closingIds, onRequestClose, onCloseComplete }) => {
  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none w-full max-w-xs pr-4">
      {/* Small styles for animation fallback */}
      <style>{`
        @keyframes toast-in { from { transform: translateY(-8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
      {toasts.map((t) => (
        <div key={t.id} style={{ animation: 'toast-in .18s ease-out' }} className="w-full pointer-events-auto">
          <Toast
            id={t.id}
            variant={t.variant}
            title={t.title}
            message={t.message}
            actions={t.actions}
            isClosing={!!closingIds[t.id]}
            onRequestClose={onRequestClose}
            onCloseComplete={onCloseComplete}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
