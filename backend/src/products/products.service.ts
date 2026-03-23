import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<ProductDocument>) {}

  async create(data: Partial<Product>): Promise<ProductDocument> {
    return this.productModel.create(data);
  }

  async findAll(): Promise<ProductDocument[]> {
    return this.productModel.find().exec();
  }

  async findById(id: string): Promise<ProductDocument | null> {
    return this.productModel.findById(id).exec();
  }

  async update(id: string, data: Partial<Product>): Promise<ProductDocument | null> {
    return this.productModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).exec();
  }

  async remove(id: string): Promise<boolean> {
    const res = await this.productModel.findByIdAndDelete(id).exec();
    return !!res;
  }
}
