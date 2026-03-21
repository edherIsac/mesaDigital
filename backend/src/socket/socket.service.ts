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
}
