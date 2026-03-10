import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Package, PackageSchema } from './schemas/package.schema';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { StudiosModule } from '../studios/studios.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Package.name, schema: PackageSchema }]),
    StudiosModule,
  ],
  providers: [PackagesService],
  controllers: [PackagesController],
  exports: [PackagesService],
})
export class PackagesModule {}
