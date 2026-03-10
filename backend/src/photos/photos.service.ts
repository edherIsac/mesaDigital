import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Photo, PhotoDocument } from './schemas/photo.schema';
import {
  Session,
  SessionDocument,
  SessionStatus,
} from '../sessions/schemas/session.schema';
import { CloudinaryService } from './cloudinary.service';

@Injectable()
export class PhotosService {
  constructor(
    @InjectModel(Photo.name) private photoModel: Model<PhotoDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  private async getSession(sessionId: string): Promise<SessionDocument> {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async uploadPhotos(
    sessionId: string,
    files: Express.Multer.File[],
  ): Promise<PhotoDocument[]> {
    const folder = `misesionpro/sessions/${sessionId}`;
    const results: PhotoDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const [original, thumb] = await Promise.all([
        this.cloudinaryService.uploadFile(file, folder),
        this.cloudinaryService.uploadThumbnail(file, `${folder}/thumbs`),
      ]);

      const photo = await this.photoModel.create({
        sessionId: new Types.ObjectId(sessionId),
        imageUrl: original.secure_url,
        thumbnailUrl: thumb.secure_url,
        cloudinaryPublicId: original.public_id,
        orderNumber: i + 1,
      });

      results.push(photo);
    }

    return results;
  }

  getUploadSignature(sessionId: string) {
    const folder = `misesionpro/sessions/${sessionId}`;
    return this.cloudinaryService.generateUploadSignature(folder);
  }

  async confirmUpload(
    sessionId: string,
    payload: {
      public_id: string;
      secure_url: string;
      format?: string;
      bytes?: number;
    },
  ): Promise<PhotoDocument> {
    await this.getSession(sessionId);

    // determine next order number
    const last = await this.photoModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .sort({ orderNumber: -1 })
      .limit(1);
    const nextOrder = last.length ? (last[0].orderNumber ?? 0) + 1 : 1;

    const thumbnailUrl = this.cloudinaryService.getThumbnailUrl(
      payload.public_id,
    );

    const photo = await this.photoModel.create({
      sessionId: new Types.ObjectId(sessionId),
      imageUrl: payload.secure_url,
      thumbnailUrl,
      cloudinaryPublicId: payload.public_id,
      orderNumber: nextOrder,
    });

    return photo;
  }

  async findBySession(sessionId: string): Promise<PhotoDocument[]> {
    return this.photoModel
      .find({ sessionId: new Types.ObjectId(sessionId) })
      .sort({ orderNumber: 1 });
  }

  async findSelectedBySession(sessionId: string): Promise<PhotoDocument[]> {
    return this.photoModel
      .find({ sessionId: new Types.ObjectId(sessionId), selected: true })
      .sort({ orderNumber: 1 });
  }

  async selectPhoto(
    sessionId: string,
    photoId: string,
    accessToken: string,
  ): Promise<{ photoId: string; selected: boolean; totalSelected: number }> {
    const session = await this.getSession(sessionId);

    if (session.accessToken !== accessToken) throw new ForbiddenException();
    if (
      session.status === SessionStatus.CONFIRMED ||
      session.status === SessionStatus.EXPIRED
    ) {
      throw new ForbiddenException('Session is locked');
    }

    const photo = await this.photoModel.findOne({
      _id: new Types.ObjectId(photoId),
      sessionId: new Types.ObjectId(sessionId),
    });
    if (!photo) throw new NotFoundException('Photo not found');

    if (!photo.selected) {
      // Atomic count + conditional update using a transaction
      const mongoSession: ClientSession =
        await this.photoModel.db.startSession();
      try {
        mongoSession.startTransaction();

        const selectedCount = await this.photoModel
          .countDocuments({
            sessionId: new Types.ObjectId(sessionId),
            selected: true,
          })
          .session(mongoSession);

        if (selectedCount >= session.maxPhotosAllowed) {
          await mongoSession.abortTransaction();
          throw new ConflictException(
            `Selection limit reached (${session.maxPhotosAllowed} photos)`,
          );
        }

        photo.selected = true;
        photo.selectedAt = new Date();
        await photo.save({ session: mongoSession });

        await mongoSession.commitTransaction();
      } finally {
        await mongoSession.endSession();
      }
    }

    const totalSelected = await this.photoModel.countDocuments({
      sessionId: new Types.ObjectId(sessionId),
      selected: true,
    });

    return { photoId: photo._id.toString(), selected: true, totalSelected };
  }

  async deselectPhoto(
    sessionId: string,
    photoId: string,
    accessToken: string,
  ): Promise<{ photoId: string; selected: boolean; totalSelected: number }> {
    const session = await this.getSession(sessionId);

    if (session.accessToken !== accessToken) throw new ForbiddenException();
    if (
      session.status === SessionStatus.CONFIRMED ||
      session.status === SessionStatus.EXPIRED
    ) {
      throw new ForbiddenException('Session is locked');
    }

    const photo = await this.photoModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(photoId),
        sessionId: new Types.ObjectId(sessionId),
      },
      { selected: false, selectedAt: null },
      { new: true },
    );
    if (!photo) throw new NotFoundException('Photo not found');

    const totalSelected = await this.photoModel.countDocuments({
      sessionId: new Types.ObjectId(sessionId),
      selected: true,
    });

    return { photoId: photo._id.toString(), selected: false, totalSelected };
  }
}
