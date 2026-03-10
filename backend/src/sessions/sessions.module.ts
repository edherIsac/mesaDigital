import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from './schemas/session.schema';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { PackagesModule } from '../packages/packages.module';
import { StudiosModule } from '../studios/studios.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    PackagesModule,
    StudiosModule,
  ],
  providers: [SessionsService],
  controllers: [SessionsController],
  exports: [SessionsService],
})
export class SessionsModule {}
