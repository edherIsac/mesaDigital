import { createContext, PropsWithChildren, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '../api/config';

export type SocketContextValue = {
  socket?: Socket;
  connected: boolean;
};

export const SocketContext = createContext<SocketContextValue>({ socket: undefined, connected: false });

export const SocketProvider = ({ children }: PropsWithChildren<unknown>) => {
  const [socket, setSocket] = useState<Socket | undefined>(undefined);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const base = (import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_API_URL ?? API_BASE ?? window.location.origin) as string;
    const s: Socket = io(base, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
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

  return <SocketContext.Provider value={{ socket, connected }}>{children}</SocketContext.Provider>;
};
