import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Package, PackageDocument } from './schemas/package.schema';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(
    @InjectModel(Package.name) private packageModel: Model<PackageDocument>,
  ) {}

  async create(
    studioId: string,
    dto: CreatePackageDto,
  ): Promise<PackageDocument> {
    return this.packageModel.create({
      ...dto,
      studioId: new Types.ObjectId(studioId),
    });
  }

  async findByStudio(studioId: string): Promise<PackageDocument[]> {
    return this.packageModel.find({ studioId: new Types.ObjectId(studioId) });
  }

  async findById(id: string): Promise<PackageDocument> {
    const pkg = await this.packageModel.findById(id);
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  async update(id: string, dto: UpdatePackageDto): Promise<PackageDocument> {
    const pkg = await this.findById(id);
    Object.assign(pkg, dto);
    return pkg.save();
  }

  async delete(id: string): Promise<void> {
    await this.packageModel.findByIdAndDelete(id);
  }
}
