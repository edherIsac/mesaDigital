import {
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Body,
  Query,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { PhotosService } from './photos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { memoryStorage } from 'multer';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

@Controller('sessions/:sessionId')
export class PhotosController {
  constructor(private photosService: PhotosService) {}

  // Studio: upload photos (multipart)
  @Post('photos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDIO, UserRole.ADMIN)
  @UseInterceptors(
    FilesInterceptor('files', 50, {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(new Error('Invalid file type'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: MAX_SIZE },
    }),
  )
  uploadPhotos(
    @Param('sessionId') sessionId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.photosService.uploadPhotos(sessionId, files);
  }

  // Studio: generate signature for direct client upload to Cloudinary
  @Get('photos/sign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDIO, UserRole.ADMIN)
  getUploadSignature(@Param('sessionId') sessionId: string) {
    return this.photosService.getUploadSignature(sessionId);
  }

  // Studio: confirm a direct upload from client and persist metadata
  @Post('photos/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDIO, UserRole.ADMIN)
  confirmUpload(
    @Param('sessionId') sessionId: string,
    @Body() body: ConfirmUploadDto,
  ) {
    return this.photosService.confirmUpload(sessionId, body as any);
  }

  // Public + client or studio: list photos
  @Get('photos')
  findAll(@Param('sessionId') sessionId: string) {
    return this.photosService.findBySession(sessionId);
  }

  // Client: select photo
  @Post('photos/:photoId/select')
  select(
    @Param('sessionId') sessionId: string,
    @Param('photoId') photoId: string,
    @Headers('x-access-token') token: string,
  ) {
    return this.photosService.selectPhoto(sessionId, photoId, token);
  }

  // Client: deselect photo
  @Post('photos/:photoId/deselect')
  deselect(
    @Param('sessionId') sessionId: string,
    @Param('photoId') photoId: string,
    @Headers('x-access-token') token: string,
  ) {
    return this.photosService.deselectPhoto(sessionId, photoId, token);
  }
}

// Studio panel: get selected photos (separate controller to match route pattern)
@Controller('studios/:studioId/sessions/:sessionId')
export class StudioSessionPhotosController {
  constructor(private photosService: PhotosService) {}

  @Get('selected')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDIO, UserRole.ADMIN)
  async getSelected(
    @Param('sessionId') sessionId: string,
    @Query('export') exportFormat: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const photos = await this.photosService.findSelectedBySession(sessionId);

    if (exportFormat === 'csv') {
      const rows = [
        'orderNumber,imageUrl,selectedAt',
        ...photos.map(
          (p) =>
            `${p.orderNumber},"${p.imageUrl}","${p.selectedAt?.toISOString() ?? ''}"`,
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="session-${sessionId}.csv"`,
      );
      return res.send(rows);
    }

    return photos;
  }
}
