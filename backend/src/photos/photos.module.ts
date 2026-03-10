import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Photo, PhotoSchema } from './schemas/photo.schema';
import { Session, SessionSchema } from '../sessions/schemas/session.schema';
import { PhotosService } from './photos.service';
import {
  PhotosController,
  StudioSessionPhotosController,
} from './photos.controller';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Photo.name, schema: PhotoSchema },
      { name: Session.name, schema: SessionSchema },
    ]),
  ],
  providers: [PhotosService, CloudinaryService],
  controllers: [PhotosController, StudioSessionPhotosController],
})
export class PhotosModule {}
