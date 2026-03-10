import { Module } from '@nestjs/common';
import { UsersModule } from '../users.module';
import { UsersAdminController } from './users-admin.controller';

@Module({
  imports: [UsersModule],
  controllers: [UsersAdminController],
})
export class UsersAdminModule {}
