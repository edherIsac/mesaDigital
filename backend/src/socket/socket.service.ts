import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class SocketService {
  private server?: Server;
  private readonly logger = new Logger(SocketService.name);

  setServer(server: Server) {
    this.server = server;
    this.logger.log('Socket server registered');
  }

  getServer(): Server {
    if (!this.server) {
      throw new Error('Socket server not initialized');
    }
    return this.server;
  }

  emit(event: string, payload: unknown) {
    this.getServer().emit(event, payload);
  }

  emitToRoom(room: string, event: string, payload: unknown) {
    try {
      this.getServer().to(room).emit(event, payload);
    } catch (e) {
      this.logger.warn(`Failed emit to room ${room} - ${event}: ${String(e)}`);
    }
  }

  emitToRooms(event: string, payload: unknown, rooms?: string[]) {
    try {
      if (!rooms || rooms.length === 0) {
        this.emit(event, payload);
        return;
      }
      const uniqRooms = Array.from(new Set((rooms || []).filter(Boolean)));
      // Emit to each room separately (union) instead of chaining .to() which
      // would broadcast only to sockets present in all rooms (intersection).
      for (const r of uniqRooms) {
        try {
          this.getServer().to(r).emit(event, payload);
        } catch (err) {
          this.logger.debug(`Failed emit to room ${r}: ${String(err)}`);
        }
      }
    } catch (e) {
      this.logger.warn(`Failed emit to rooms ${rooms}: ${String(e)}`);
    }
  }

  emitToRoles(roles: string[], event: string, payload: unknown) {
    const rooms = (roles || []).map((r) => `role:${r}`);
    this.emitToRooms(event, payload, rooms);
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    try {
      this.getServer().to(`user:${userId}`).emit(event, payload);
    } catch (e) {
      this.logger.warn(`Failed emit to user ${userId} - ${event}: ${String(e)}`);
    }
  }
}
