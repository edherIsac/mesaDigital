import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [{ quality: 'auto', fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error)
            return reject(
              new Error(
                `Cloudinary upload error: ${error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)}`,
              ),
            );
          if (!result)
            return reject(new Error('Cloudinary upload failed: no result'));
          resolve(result);
        },
      );
      Readable.from(file.buffer).pipe(upload);
    });
  }

  async uploadThumbnail(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder,
          transformation: [
            { width: 400, height: 300, crop: 'fill', quality: 'auto' },
          ],
        },
        (error, result) => {
          if (error)
            return reject(
              new Error(
                `Cloudinary upload error: ${error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error)}`,
              ),
            );
          if (!result)
            return reject(new Error('Cloudinary upload failed: no result'));
          resolve(result);
        },
      );
      Readable.from(file.buffer).pipe(upload);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  generateUploadSignature(folder: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      this.config.get<string>('CLOUDINARY_API_SECRET')!,
    );

    return {
      apiKey: this.config.get<string>('CLOUDINARY_API_KEY'),
      cloudName: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      timestamp,
      signature,
      folder,
    };
  }

  getThumbnailUrl(publicId: string) {
    return cloudinary.url(publicId, {
      width: 400,
      height: 300,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
    });
  }
}
