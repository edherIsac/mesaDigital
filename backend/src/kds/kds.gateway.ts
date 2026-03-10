import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { OrdersService } from '../orders/orders.service';

@WebSocketGateway({ namespace: 'kds', cors: true })
export class KdsGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(KdsGateway.name);

  constructor(private readonly ordersService: OrdersService) {}

  afterInit() {
    this.logger.log('KDS Gateway initialized');
  }

  @SubscribeMessage('kds.action')
  async handleKdsAction(@MessageBody() payload: any) {
    // payload: { orderId, itemId, action, actorId }
    try {
      const { orderId, itemId, action, actorId } = payload || {};
      if (!orderId || !itemId || !action) return { status: 'error', message: 'invalid payload' };

      // Interpret action as status for the item
      const dto = { status: action, actorId };
      const updated = await this.ordersService.updateItem(orderId, itemId, dto as any);

      // Notify clients subscribed to order or station (simple emit)
      this.server.emit(`order.${orderId}.item.updated`, { orderId, itemId, status: action });

      return { status: 'ok', data: updated };
    } catch (err) {
      this.logger.error(err);
      return { status: 'error', message: err.message };
    }
  }
}
