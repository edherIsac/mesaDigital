import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

  // Track recent item-level events per order so we can consolidate order-level updates
  type RecentOrderEntry = { ts: number; item: unknown; notifId?: string };
  const recentOrderEventsRef = useRef<Map<string, RecentOrderEntry>>(new Map());

  const addNotification = (n: Partial<Notification>) => {
    // Play a short notification sound using WebAudio API (no asset required).
    const playNotificationSound = () => {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 1000;
        g.gain.value = 0.0001;
        o.connect(g);
        g.connect(ctx.destination);
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
        o.start(now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        o.stop(now + 0.2);
        // close context shortly after to free resources
        setTimeout(() => {
          try { ctx.close(); } catch (_) {}
        }, 500);
      } catch (e) {
        // ignore audio errors
      }
    };

    // Attempt to play sound for every incoming notification (may be blocked by browser until user interacts).
    playNotificationSound();
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

    // Window to consider item+order events related and eligible for consolidation
    const DEDUPE_WINDOW_MS = 800;

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
      const orderId = obj.orderId as string | undefined;
      // If a recent item-level event for this order exists, consolidate into the item notification
      if (orderId) {
        const recent = recentOrderEventsRef.current.get(orderId);
        if (recent && Date.now() - recent.ts < DEDUPE_WINDOW_MS) {
          // Merge order payload into the existing item notification (if we have its id)
          if (recent.notifId) {
            try {
              const itemEvent = recent.item as Record<string, unknown> | undefined;
              const itemName = itemEvent?.item && (itemEvent.item as any).name ? (itemEvent.item as any).name : undefined;
              const tableLabel = (obj.tableLabel as string | undefined) ?? (itemEvent?.tableLabel as string | undefined);
              const orderStatus = (obj.status as string | undefined) ?? (obj.newStatus as string | undefined) ?? undefined;

              const mergedTitle = itemName ? `${itemName} — ${orderStatus ?? 'actualizado'}` : (obj.title as string | undefined) ?? `Pedido ${(obj.orderId as string | undefined) ?? ''} actualizado`;

              const orderNewPeople = Number(obj.newPeopleCount ?? 0);
              const orderNewItems = Number(obj.newItemsCount ?? 0);
              const orderParts: string[] = [];
              if (tableLabel) orderParts.push(`Mesa: ${tableLabel}`);
              if (orderNewPeople > 0) orderParts.push(`+${orderNewPeople} personas`);
              if (orderNewItems > 0) orderParts.push(`+${orderNewItems} platillos`);

              const item = itemEvent?.item as Record<string, any> | undefined;
              const itemParts: string[] = [];
              if (tableLabel) itemParts.push(`Mesa: ${tableLabel}`);
              if (item?.personName) itemParts.push(`Para: ${item.personName}`);
              if (item?.name) itemParts.push(`Platillo: ${item.name}`);

              const mergedMessage = itemParts.concat(orderParts).join(' — ') || (obj.message as string | undefined) || (obj.status as string | undefined) || undefined;

              // Update the existing notification in-place
              setNotifications((prev) => prev.map((n) => (n.id === recent.notifId ? { ...n, title: mergedTitle, message: mergedMessage, data: { order: obj, item: itemEvent?.item ?? itemEvent } } : n)));
            } catch (e) {
              // ignore update errors
            }
          }
          recentOrderEventsRef.current.delete(orderId);
          return;
        }
      }
      const title = (obj.title as string | undefined) ?? `Pedido ${(obj.orderId as string | undefined) ?? ''} actualizado`;
      // If payload contains newPeopleCount/newItemsCount, show only those deltas (for kitchen)
      const newPeople = Number(obj.newPeopleCount ?? 0);
      const newItems = Number(obj.newItemsCount ?? 0);
      const tableLabel = obj.tableLabel as string | undefined;
      let message: string | undefined;
      if (newPeople > 0 || newItems > 0) {
        const parts: string[] = [];
        if (tableLabel) parts.push(`Mesa: ${tableLabel}`);
        if (newPeople > 0) parts.push(`+${newPeople} personas`);
        if (newItems > 0) parts.push(`+${newItems} platillos`);
        message = parts.join(' — ');
      } else {
        message = (obj.message as string | undefined) ?? (obj.status as string | undefined) ?? undefined;
      }
      addNotification({ type: 'order', title, message, data: payload });
    };

    const onOrderCreate = (payload: unknown) => {
      const obj = isObject(payload) ? payload as Record<string, unknown> : {};
      const title = (obj.title as string | undefined) ?? `Nuevo pedido ${(obj.orderId as string | undefined) ?? ''}`;
      const tableLabel = obj.tableLabel as string | undefined;
      const people = Number(obj.newPeopleCount ?? obj.peopleCount ?? 0);
      const items = Number(obj.newItemsCount ?? obj.itemsCount ?? 0);
      const parts: string[] = [];
      if (tableLabel) parts.push(`Mesa: ${tableLabel}`);
      if (people > 0) parts.push(`${people} personas`);
      if (items > 0) parts.push(`${items} platillos`);
      const message = (obj.message as string | undefined) ?? (parts.length ? parts.join(' — ') : `Total: ${(obj.total as string | number | undefined) ?? ''}`);
      addNotification({ type: 'order', title, message, data: payload });
    };

    const onItemStatus = (payload: unknown) => {
      try {
        const obj = isObject(payload) ? payload as Record<string, unknown> : {};
        const orderId = obj.orderId as string | undefined;
        // create a deterministic id so we can update this notification later if an order:update follows
        const notifId = Math.random().toString(36).slice(2);
        const tableLabel = obj.tableLabel as string | undefined;
        const item = obj.item as Record<string, any> | undefined;
        const itemName = item?.name as string | undefined;
        const personName = item?.personName as string | undefined;
        const parts: string[] = [];
        if (tableLabel) parts.push(`Mesa: ${tableLabel}`);
        if (personName) parts.push(`Para: ${personName}`);
        if (itemName) parts.push(`Platillo: ${itemName}`);
        const message = parts.length ? parts.join(' — ') : (obj.message as string | undefined) ?? String(obj.orderId ?? obj.newStatus ?? '');
        const title = itemName ? `${itemName} — ${(obj.newStatus as string | undefined) ?? (obj.newStatus as string) ?? 'actualizado'}` : `Pedido ${(obj.orderId as string | undefined) ?? ''} actualizado`;
        // Insert notification with known id so we can update it if needed
        addNotification({ id: notifId, type: 'order', title, message, data: payload });
        if (orderId) recentOrderEventsRef.current.set(orderId, { ts: Date.now(), item: obj, notifId });
      } catch (e) {
        // ignore malformed payload
      }
    };

    socket.on('notification', onNotification);
    socket.on('order:updated', onOrderUpdate);
    socket.on('order:created', onOrderCreate);
    socket.on('order:item:status.changed', onItemStatus);

    return () => {
      socket.off('notification', onNotification);
      socket.off('order:updated', onOrderUpdate);
      socket.off('order:created', onOrderCreate);
      socket.off('order:item:status.changed', onItemStatus);
      try { recentOrderEventsRef.current.clear(); } catch (_) {}
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
