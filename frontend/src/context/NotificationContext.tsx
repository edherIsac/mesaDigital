import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { SocketContext } from './SocketContext';

export type Notification = {
  id: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'order';
  title: string;
  message?: string;
  data?: unknown;
  read?: boolean;
  createdAt: number;
};

type NotificationContextValue = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Partial<Notification>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markRead: () => {},
  markAllRead: () => {},
  removeNotification: () => {},
});

export const NotificationProvider = ({ children }: PropsWithChildren<unknown>) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { socket } = useContext(SocketContext);

  const addNotification = (n: Partial<Notification>) => {
    const notif: Notification = {
      id: n.id ?? Math.random().toString(36).slice(2),
      type: n.type ?? 'info',
      title: n.title ?? (n.data && (n.data.title as string)) ?? 'Notificación',
      message: n.message ?? (n.data && (n.data.message as string)) ?? undefined,
      data: n.data ?? undefined,
      read: n.read ?? false,
      createdAt: n.createdAt ?? Date.now(),
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((p) => (p.id === id ? { ...p, read: true } : p)));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((p) => ({ ...p, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((p) => p.id !== id));
  };

  // Subscribe to socket events and normalize incoming payloads
  useEffect(() => {
    if (!socket) return;

    const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object';

    const onNotification = (payload: unknown) => {
      try {
        // Normalize common shapes
        if (Array.isArray(payload)) {
          (payload as unknown[]).forEach((p) => addNotification((p as Partial<Notification>)));
          return;
        }
        if (isObject(payload)) {
          addNotification(payload as Partial<Notification>);
          return;
        }
        // fallback
        addNotification({ title: String(payload) });
      } catch (err) {
        // ignore malformed notifications
        console.warn('Malformed notification payload', err);
      }
    };

    const onOrderUpdate = (payload: unknown) => {
      const obj = isObject(payload) ? payload as Record<string, unknown> : {};
      const title = (obj.title as string | undefined) ?? `Pedido ${(obj.orderId as string | undefined) ?? ''} actualizado`;
      const message = (obj.message as string | undefined) ?? (obj.status as string | undefined) ?? undefined;
      addNotification({ type: 'order', title, message, data: payload });
    };

    const onOrderCreate = (payload: unknown) => {
      const obj = isObject(payload) ? payload as Record<string, unknown> : {};
      const title = (obj.title as string | undefined) ?? `Nuevo pedido ${(obj.orderId as string | undefined) ?? ''}`;
      const message = (obj.message as string | undefined) ?? `Total: ${(obj.total as string | number | undefined) ?? ''}`;
      addNotification({ type: 'order', title, message, data: payload });
    };

    socket.on('notification', onNotification);
    socket.on('order:updated', onOrderUpdate);
    socket.on('order:created', onOrderCreate);

    return () => {
      socket.off('notification', onNotification);
      socket.off('order:updated', onOrderUpdate);
      socket.off('order:created', onOrderCreate);
    };
  }, [socket]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markRead, markAllRead, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

export default NotificationContext;
