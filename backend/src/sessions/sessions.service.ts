import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';
import {
  Session,
  SessionDocument,
  SessionStatus,
} from './schemas/session.schema';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionStatusDto } from './dto/update-session-status.dto';
import { PackagesService } from '../packages/packages.service';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    private packagesService: PackagesService,
  ) {}

  async create(
    studioId: string,
    dto: CreateSessionDto,
  ): Promise<SessionDocument> {
    const expiresAt = new Date(dto.expiresAt);
    if (expiresAt <= new Date()) {
      throw new BadRequestException('expiresAt must be a future date');
    }

    const pkg = await this.packagesService.findById(dto.packageId);

    const session = await this.sessionModel.create({
      studioId: new Types.ObjectId(studioId),
      clientName: dto.clientName,
      clientEmail: dto.clientEmail,
      packageId: new Types.ObjectId(dto.packageId),
      maxPhotosAllowed: pkg.maxPhotos,
      accessToken: uuidv4(),
      expiresAt,
    });

    return session;
  }

  async findById(id: string): Promise<SessionDocument> {
    const session = await this.sessionModel.findById(id);
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async validateToken(token: string): Promise<SessionDocument> {
    const session = await this.sessionModel.findOne({ accessToken: token });
    if (!session) throw new NotFoundException('Invalid access token');

    // Auto-expire if past date
    if (
      session.status === SessionStatus.ACTIVE &&
      session.expiresAt < new Date()
    ) {
      session.status = SessionStatus.EXPIRED;
      await session.save();
    }

    return session;
  }

  async confirm(sessionId: string, accessToken: string) {
    const session = await this.findById(sessionId);
    if (session.accessToken !== accessToken) throw new ForbiddenException();
    if (session.status !== SessionStatus.ACTIVE) {
      throw new ForbiddenException('Session is not active');
    }

    session.status = SessionStatus.CONFIRMED;
    await session.save();

    return {
      sessionId: session._id,
      status: session.status,
      confirmedAt: new Date(),
    };
  }

  async findByStudio(
    studioId: string,
    status?: SessionStatus,
  ): Promise<SessionDocument[]> {
    const filter: any = { studioId: new Types.ObjectId(studioId) };
    if (status) filter.status = status;
    return this.sessionModel.find(filter).sort({ createdAt: -1 });
  }

  async updateStatus(
    sessionId: string,
    dto: UpdateSessionStatusDto,
  ): Promise<SessionDocument> {
    const session = await this.findById(sessionId);
    const allowed: SessionStatus[] = [
      SessionStatus.EDITING,
      SessionStatus.DONE,
      SessionStatus.EXPIRED,
    ];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException('Invalid status transition');
    }
    session.status = dto.status;
    return session.save();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoExpireSessions(): Promise<void> {
    const result = await this.sessionModel.updateMany(
      { status: SessionStatus.ACTIVE, expiresAt: { $lt: new Date() } },
      { $set: { status: SessionStatus.EXPIRED } },
    );
    if (result.modifiedCount > 0) {
      this.logger.log(`Auto-expired ${result.modifiedCount} session(s)`);
    }
  }
}
