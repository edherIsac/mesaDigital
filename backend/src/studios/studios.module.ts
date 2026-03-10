import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Studio, StudioSchema } from './schemas/studio.schema';
import { StudiosService } from './studios.service';
import { StudiosController } from './studios.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Studio.name, schema: StudioSchema }]),
  ],
  providers: [StudiosService],
  controllers: [StudiosController],
  exports: [StudiosService],
})
export class StudiosModule {}
