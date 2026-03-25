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
import { Server } from 'socket.io';
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

  handleConnection(client: any) {
    this.logger.log(`Client connected: ${client.id}`);
    // If client provided role/userId/location in handshake, auto-join rooms
    const auth = client.handshake?.auth ?? client.handshake?.query ?? {};
    try {
      if (auth.role) {
        const r = String(auth.role);
        client.join(`role:${r}`);
        this.logger.log(`Client ${client.id} joined role:${r}`);
      }
      if (auth.userId) {
        const u = String(auth.userId);
        client.join(`user:${u}`);
        this.logger.log(`Client ${client.id} joined user:${u}`);
      }
      if (auth.locationId) {
        const l = String(auth.locationId);
        client.join(`location:${l}`);
        this.logger.log(`Client ${client.id} joined location:${l}`);
      }
    } catch (e) {
      this.logger.debug('Auto-join failed for client', e as any);
    }
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() data: { rooms?: string[] }, @ConnectedSocket() client: any) {
    if (!data || !Array.isArray(data.rooms)) return { ok: false };
    for (const r of data.rooms) {
      try {
        client.join(r);
      } catch (e) {
        this.logger.warn(`Failed to join room ${r} for ${client.id}`, e as any);
      }
    }
    this.logger.log(`Client ${client.id} joined rooms: ${data.rooms.join(',')}`);
    return { ok: true };
  }

  @SubscribeMessage('leave')
  handleLeave(@MessageBody() data: { rooms?: string[] }, @ConnectedSocket() client: any) {
    if (!data || !Array.isArray(data.rooms)) return { ok: false };
    for (const r of data.rooms) {
      try {
        client.leave(r);
      } catch (e) {
        this.logger.warn(`Failed to leave room ${r} for ${client.id}`, e as any);
      }
    }
    this.logger.log(`Client ${client.id} left rooms: ${data.rooms.join(',')}`);
    return { ok: true };
  }
}
