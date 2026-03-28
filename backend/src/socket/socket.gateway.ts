import { Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SocketService } from './socket.service';

@WebSocketGateway({ cors: true })
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);

  constructor(private readonly socketService: SocketService) {}

  afterInit() {
    this.logger.log('Global SocketGateway initialized');
    this.socketService.setServer(this.server);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // If client provided role/userId/location in handshake, auto-join rooms
    const auth = client.handshake?.auth ?? client.handshake?.query ?? {};
    const authObj = auth as Record<string, unknown>;
    try {
      if (typeof authObj.role === 'string' && authObj.role) {
        const r = String(authObj.role);
        client.join(`role:${r}`);
        this.logger.log(`Client ${client.id} joined role:${r}`);
      }
      if (typeof authObj.userId === 'string' && authObj.userId) {
        const u = String(authObj.userId);
        client.join(`user:${u}`);
        this.logger.log(`Client ${client.id} joined user:${u}`);
      }
      if (typeof authObj.locationId === 'string' && authObj.locationId) {
        const l = String(authObj.locationId);
        client.join(`location:${l}`);
        this.logger.log(`Client ${client.id} joined location:${l}`);
      }
    } catch (e) {
      this.logger.debug(`Auto-join failed for client ${client.id}: ${String(e)}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

}
