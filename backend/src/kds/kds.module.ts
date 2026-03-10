import { Module } from '@nestjs/common';
import { KdsGateway } from './kds.gateway';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  providers: [KdsGateway],
  exports: [],
})
export class KdsModule {}
