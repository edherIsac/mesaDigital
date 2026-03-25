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

  emit(event: string, payload: any) {
    this.getServer().emit(event, payload);
  }

  emitToRoom(room: string, event: string, payload: any) {
    try {
      this.getServer().to(room).emit(event, payload);
    } catch (e) {
      this.logger.warn(`Failed emit to room ${room} - ${event}`, e as any);
    }
  }

  emitToRooms(event: string, payload: any, rooms?: string[]) {
    try {
      if (!rooms || rooms.length === 0) {
        this.emit(event, payload);
        return;
      }
      for (const r of rooms) {
        this.getServer().to(r).emit(event, payload);
      }
    } catch (e) {
      this.logger.warn(`Failed emit to rooms ${rooms}`, e as any);
    }
  }

  emitToRoles(roles: string[], event: string, payload: any) {
    const rooms = (roles || []).map((r) => `role:${r}`);
    this.emitToRooms(event, payload, rooms);
  }

  emitToUser(userId: string, event: string, payload: any) {
    try {
      this.getServer().to(`user:${userId}`).emit(event, payload);
    } catch (e) {
      this.logger.warn(`Failed emit to user ${userId} - ${event}`, e as any);
    }
  }
}
