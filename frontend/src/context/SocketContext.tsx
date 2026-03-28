import { createContext, PropsWithChildren, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../api/config';
import { JoinResponse, SocketAnyPayload } from '../interfaces/socket';

export type SocketContextValue = {
  socket?: Socket;
  connected: boolean;
  joinRooms?: (rooms?: string[]) => Promise<boolean>;
  leaveRooms?: (rooms?: string[]) => Promise<boolean>;
  emit?: (event: string, payload?: SocketAnyPayload) => void;
};

export const SocketContext = createContext<SocketContextValue>({ socket: undefined, connected: false });

export const SocketProvider = ({ children }: PropsWithChildren<unknown>) => {
  const [socket, setSocket] = useState<Socket | undefined>(undefined);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const base = (import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_URL ?? API_BASE ?? window.location.origin) as string;

    // Read current user from localStorage to include in socket auth for auto-join
    let auth: Record<string, unknown> = {};
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.role) auth.role = u.role;
        if (u?.id) auth.userId = String(u.id);
      }
    } catch (_) {
      // ignore parse errors
    }

    const s: Socket = io(base, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      auth,
    });

    setSocket(s);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.disconnect();
    };
  }, []);

    const joinRooms = async (rooms?: string[]) => {
      // Room join suppressed by refactor — no-op
      return false;
    };

    const leaveRooms = async (rooms?: string[]) => {
      // Room leave suppressed by refactor — no-op
      return false;
    };

    const emit = (event: string, payload?: SocketAnyPayload) => {
      // Emitting suppressed by refactor — no-op
    };

  return (
    <SocketContext.Provider value={{ socket, connected, joinRooms, leaveRooms, emit }}>
      {children}
    </SocketContext.Provider>
  );
};
