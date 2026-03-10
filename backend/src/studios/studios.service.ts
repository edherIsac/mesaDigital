import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Studio, StudioDocument } from './schemas/studio.schema';
import { CreateStudioDto } from './dto/create-studio.dto';
import { UpdateStudioDto } from './dto/update-studio.dto';
import { UserRole } from '../users/schemas/user.schema';

@Injectable()
export class StudiosService {
  constructor(
    @InjectModel(Studio.name) private studioModel: Model<StudioDocument>,
  ) {}

  async create(dto: CreateStudioDto, ownerId: string): Promise<StudioDocument> {
    return this.studioModel.create({
      ...dto,
      ownerId: new Types.ObjectId(ownerId),
    });
  }

  async findAll(userId: string, role: UserRole): Promise<StudioDocument[]> {
    if (role === UserRole.ADMIN) return this.studioModel.find();
    return this.studioModel.find({ ownerId: new Types.ObjectId(userId) });
  }

  async findById(id: string): Promise<StudioDocument> {
    const studio = await this.studioModel.findById(id);
    if (!studio) throw new NotFoundException('Studio not found');
    return studio;
  }

  async update(
    id: string,
    dto: UpdateStudioDto,
    userId: string,
    role: UserRole,
  ): Promise<StudioDocument> {
    const studio = await this.findById(id);
    if (role !== UserRole.ADMIN && studio.ownerId.toString() !== userId) {
      throw new ForbiddenException();
    }
    Object.assign(studio, dto);
    return studio.save();
  }

  async ownerCheck(
    studioId: string,
    userId: string,
    role: UserRole,
  ): Promise<StudioDocument> {
    const studio = await this.findById(studioId);
    if (role !== UserRole.ADMIN && studio.ownerId.toString() !== userId) {
      throw new ForbiddenException();
    }
    return studio;
  }
}
