import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [OrdersModule, SocketModule],
})
export class KdsModule {}
