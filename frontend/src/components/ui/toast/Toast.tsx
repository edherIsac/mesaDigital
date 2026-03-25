import React, { useEffect, useRef, useState } from 'react';

type Variant = 'success' | 'error' | 'warning' | 'info' | 'default';

export type ToastAction = {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
};

interface Props {
  id: string;
  variant?: Variant;
  title?: string;
  message: string;
  duration?: number | null;
  actions?: ToastAction[];
  isClosing?: boolean;
  onRequestClose: (id: string) => void;
  onCloseComplete: (id: string) => void;
}

const ANIM_MS = 220;

const Toast: React.FC<Props> = ({ id, variant = 'default', title, message, duration, actions, isClosing, onRequestClose, onCloseComplete }) => {
  const [exiting, setExiting] = useState<boolean>(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isClosing) {
      setExiting(true);
      const t = window.setTimeout(() => onCloseComplete(id), ANIM_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isClosing, id, onCloseComplete]);

  // Auto-dismiss after `duration` milliseconds if provided (and > 0).
  useEffect(() => {
    if (typeof duration === 'number' && duration > 0) {
      const timer = window.setTimeout(() => {
        onRequestClose(id);
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration, id, onRequestClose]);

  // If user requests close (click), start the same sequence
  useEffect(() => {
    if (exiting && !isClosing) {
      // notify parent to mark closing; parent will set isClosing -> component will complete
      onRequestClose(id);
    }
  }, [exiting, isClosing, id, onRequestClose]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Escape') onRequestClose(id);
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [id, onRequestClose]);

  const iconAccent = {
    success: 'from-green-500 to-green-300',
    error: 'from-red-500 to-red-300',
    warning: 'from-yellow-500 to-yellow-300',
    info: 'from-blue-500 to-blue-300',
    default: 'from-gray-300 to-gray-100',
  }[variant];

  const containerVariant = {
    success: {
      bg: 'bg-green-50/40 dark:bg-green-900/24',
      border: 'border-green-100 dark:border-green-700',
      title: 'text-green-900 dark:text-white/90',
      message: 'text-green-800 dark:text-green-200',
    },
    error: {
      bg: 'bg-red-50/40 dark:bg-red-900/24',
      border: 'border-red-100 dark:border-red-700',
      title: 'text-red-900 dark:text-white/90',
      message: 'text-red-800 dark:text-red-200',
    },
    warning: {
      bg: 'bg-yellow-50/36 dark:bg-yellow-900/20',
      border: 'border-yellow-100 dark:border-yellow-700',
      title: 'text-yellow-900 dark:text-white/90',
      message: 'text-yellow-800 dark:text-yellow-200',
    },
    info: {
      bg: 'bg-blue-50/36 dark:bg-blue-900/22',
      border: 'border-blue-100 dark:border-blue-700',
      title: 'text-blue-900 dark:text-white/90',
      message: 'text-blue-800 dark:text-blue-200',
    },
    default: {
      bg: 'bg-white/70 dark:bg-gray-900/70',
      border: 'border-white/10 dark:border-white/[0.06]',
      title: 'text-gray-800 dark:text-white/90',
      message: 'text-gray-700 dark:text-gray-300',
    },
  }[variant];

  const icon = (() => {
    if (variant === 'success') return (<svg className="w-5 h-5 text-green-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>);
    if (variant === 'error') return (<svg className="w-5 h-5 text-red-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>);
    if (variant === 'warning') return (<svg className="w-5 h-5 text-yellow-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>);
    if (variant === 'info') return (<svg className="w-5 h-5 text-blue-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 110-16 8 8 0 010 16z"/></svg>);
    return (<svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/></svg>);
  })();

  return (
    <div
      ref={rootRef}
      tabIndex={0}
      role="status"
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto w-full rounded-xl shadow-md ${containerVariant.bg} ${containerVariant.border} backdrop-blur-sm overflow-hidden flex items-start gap-3 p-3 transition-all duration-200 ease-out transform ${exiting ? 'opacity-0 translate-x-4 scale-95' : 'opacity-100 translate-x-0'}`}
    >
      <div className={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br ${iconAccent} bg-opacity-30`}> 
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        {title && <div className={`text-sm font-semibold ${containerVariant.title} whitespace-normal break-words`}>{title}</div>}
        <div className={`mt-0.5 text-sm ${containerVariant.message} leading-snug whitespace-normal break-words`}>{message}</div>

        {actions && actions.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={() => { a.onClick?.(); onRequestClose(id); }}
                className={`text-sm px-3 py-1.5 rounded-md transition-colors ${a.variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : a.variant === 'secondary' ? 'bg-white/30 text-gray-800 hover:bg-white/40' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 ml-2">
        <button
          aria-label="Cerrar"
          onClick={() => setExiting(true)}
          className="p-1 rounded-md text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;
