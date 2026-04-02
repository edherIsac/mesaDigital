import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { SocketContext } from "./SocketContext";

export type Notification = {
  id: string;
  type?: "info" | "success" | "warning" | "error" | "order";
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

export const NotificationProvider = ({
  children,
}: PropsWithChildren<unknown>) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const lastNotifIdRef = useRef<string | null>(null);
  const { socket, connected } = useContext(SocketContext);

  const addNotification = useCallback((n: Partial<Notification>, fromEvent?: string) => {
    // Generate or use existing id for deduplication
    const notifId = n.id ?? `${fromEvent ?? 'notif'}-${Date.now()}`;
    
    // Skip if this is the same notification we just added (within 1 second)
    if (lastNotifIdRef.current && notifId === lastNotifIdRef.current) {
      return;
    }
    // Play a short notification sound using WebAudio API (no asset required).
    const playNotificationSound = () => {
      try {
        const AudioCtx = window.AudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
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
          try {
            ctx.close();
          } catch {
            // ignore close error
          }
        }, 500);
      } catch {
        // ignore audio errors
      }
    };

    // Attempt to play sound for every incoming notification (may be blocked by browser until user interacts).
    playNotificationSound();
    const notif: Notification = {
      id: notifId,
      type: n.type ?? "info",
      title: n.title ?? "Notificación",
      message: n.message ?? undefined,
      data: n.data ?? undefined,
      read: n.read ?? false,
      createdAt: n.createdAt ?? Date.now(),
    };
    setNotifications((prev) => [notif, ...prev]);
    lastNotifIdRef.current = notifId;

    // Clear the deduplication id after 1 second
    setTimeout(() => {
      lastNotifIdRef.current = null;
    }, 1000);
  }, [setNotifications]);

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((p) => (p.id === id ? { ...p, read: true } : p)),
    );
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((p) => ({ ...p, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((p) => p.id !== id));
  };

  // Socket-based notification listeners
  useEffect(() => {
    if (!socket || !connected) return;

    // Handler for generic notifications
    const handleNotification = (payload: Partial<Notification>) => {
      addNotification(payload, 'notification');
    };

    // Handler for order created events
    const handleOrderCreated = (payload: { notification?: Partial<Notification> }) => {
      if (payload.notification) {
        addNotification(payload.notification, 'order:created');
      }
    };

    // Handler for order updated events
    const handleOrderUpdated = (payload: { notification?: Partial<Notification> }) => {
      if (payload.notification) {
        addNotification(payload.notification, 'order:updated');
      }
    };

    // Handler for item status changed events
    const handleItemStatusChanged = (payload: { notification?: Partial<Notification> }) => {
      if (payload.notification) {
        addNotification(payload.notification, 'item:statusChanged');
      }
    };

    // Handler for table status changed events
    const handleTableStatusChanged = (payload: {
      newStatus?: string;
      tableLabel?: string;
      tableId?: string;
    }) => {
      // Only show notification for significant table changes
      if (
        payload.newStatus === "occupied" ||
        payload.newStatus === "available"
      ) {
        addNotification({
          type: "info",
          title: `Mesa ${payload.tableLabel || payload.tableId}: ${payload.newStatus}`,
          message: `La mesa ${payload.tableLabel || ""} ahora está ${payload.newStatus}`,
          data: payload,
          createdAt: Date.now(),
        });
      }
    };

    // Register listeners
    socket.on("notification", handleNotification);
    socket.on("order:created", handleOrderCreated);
    socket.on("order:updated", handleOrderUpdated);
    socket.on("item:statusChanged", handleItemStatusChanged);
    socket.on("table:statusChanged", handleTableStatusChanged);

    // Cleanup
    return () => {
      socket.off("notification", handleNotification);
      socket.off("order:created", handleOrderCreated);
      socket.off("order:updated", handleOrderUpdated);
      socket.off("item:statusChanged", handleItemStatusChanged);
      socket.off("table:statusChanged", handleTableStatusChanged);
    };
  }, [socket, connected, addNotification]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markRead,
        markAllRead,
        removeNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);

export default NotificationContext;
