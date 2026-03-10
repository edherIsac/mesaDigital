import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Photo } from './schemas/photo.schema';
import { Session, SessionStatus } from '../sessions/schemas/session.schema';
import { PhotosService } from './photos.service';
import { CloudinaryService } from './cloudinary.service';

// ─── helpers ────────────────────────────────────────────────────────────────

const makeId = () => new Types.ObjectId().toString();

function makeSession(overrides: Partial<Record<string, any>> = {}) {
  return {
    _id: new Types.ObjectId(),
    accessToken: 'valid-token',
    maxPhotosAllowed: 3,
    status: SessionStatus.ACTIVE,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makePhoto(overrides: Partial<Record<string, any>> = {}) {
  return {
    _id: new Types.ObjectId(),
    selected: false,
    selectedAt: null,
    orderNumber: 1,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ─── shared mock factory ──────────────────────────────────────────────────────

function buildMocks() {
  // We need to track "transaction" calls so we can honour commitTransaction
  const mockMongoSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  };

  const mockDb = {
    startSession: jest.fn().mockResolvedValue(mockMongoSession),
  };

  const photoModelMock = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    db: mockDb,
  };

  const sessionModelMock = {
    findById: jest.fn(),
  };

  const cloudinaryMock = {
    uploadFile: jest.fn(),
    uploadThumbnail: jest.fn(),
    generateUploadSignature: jest.fn(),
    getThumbnailUrl: jest.fn(),
  };

  return { photoModelMock, sessionModelMock, cloudinaryMock, mockMongoSession };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('PhotosService', () => {
  let service: PhotosService;
  let photoModelMock: ReturnType<typeof buildMocks>['photoModelMock'];
  let sessionModelMock: ReturnType<typeof buildMocks>['sessionModelMock'];
  let mockMongoSession: ReturnType<typeof buildMocks>['mockMongoSession'];

  beforeEach(async () => {
    const mocks = buildMocks();
    photoModelMock = mocks.photoModelMock;
    sessionModelMock = mocks.sessionModelMock;
    mockMongoSession = mocks.mockMongoSession;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhotosService,
        { provide: getModelToken(Photo.name), useValue: photoModelMock },
        { provide: getModelToken(Session.name), useValue: sessionModelMock },
        { provide: CloudinaryService, useValue: mocks.cloudinaryMock },
      ],
    }).compile();

    service = module.get<PhotosService>(PhotosService);
  });

  // ── selectPhoto ─────────────────────────────────────────────────────────────

  describe('selectPhoto', () => {
    it('selects a photo when limit is not reached', async () => {
      const sessionId = makeId();
      const photoId = makeId();
      const photo = makePhoto({ _id: new Types.ObjectId(photoId) });
      const session = makeSession();

      sessionModelMock.findById.mockResolvedValue(session);
      photoModelMock.findOne.mockResolvedValue(photo);
      // First countDocuments inside transaction: currently 1 selected (< 3)
      // Second countDocuments after commit: 2 total
      photoModelMock.countDocuments
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(1) } as any)
        .mockResolvedValueOnce(2);

      const result = await service.selectPhoto(
        sessionId,
        photoId,
        'valid-token',
      );

      expect(result.selected).toBe(true);
      expect(result.totalSelected).toBe(2);
      expect(photo.save).toHaveBeenCalled();
      expect(mockMongoSession.commitTransaction).toHaveBeenCalled();
    });

    it('throws ConflictException when selection limit is reached', async () => {
      const sessionId = makeId();
      const photoId = makeId();
      const photo = makePhoto({ _id: new Types.ObjectId(photoId) });
      const session = makeSession({ maxPhotosAllowed: 3 });

      sessionModelMock.findById.mockResolvedValue(session);
      photoModelMock.findOne.mockResolvedValue(photo);
      // Already 3 selected — limit reached
      photoModelMock.countDocuments.mockReturnValueOnce({
        session: jest.fn().mockResolvedValue(3),
      } as any);

      await expect(
        service.selectPhoto(sessionId, photoId, 'valid-token'),
      ).rejects.toThrow(ConflictException);

      expect(mockMongoSession.abortTransaction).toHaveBeenCalled();
    });

    it('throws ForbiddenException when accessToken does not match', async () => {
      const sessionId = makeId();
      const photoId = makeId();
      sessionModelMock.findById.mockResolvedValue(
        makeSession({ accessToken: 'real-token' }),
      );

      await expect(
        service.selectPhoto(sessionId, photoId, 'wrong-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when session is CONFIRMED', async () => {
      const sessionId = makeId();
      const photoId = makeId();
      sessionModelMock.findById.mockResolvedValue(
        makeSession({ status: SessionStatus.CONFIRMED }),
      );

      await expect(
        service.selectPhoto(sessionId, photoId, 'valid-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when session is EXPIRED', async () => {
      const sessionId = makeId();
      const photoId = makeId();
      sessionModelMock.findById.mockResolvedValue(
        makeSession({ status: SessionStatus.EXPIRED }),
      );

      await expect(
        service.selectPhoto(sessionId, photoId, 'valid-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when photo does not belong to session', async () => {
      const sessionId = makeId();
      const photoId = makeId();
      sessionModelMock.findById.mockResolvedValue(makeSession());
      photoModelMock.findOne.mockResolvedValue(null);

      await expect(
        service.selectPhoto(sessionId, photoId, 'valid-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns current count without re-selecting an already-selected photo', async () => {
      const sessionId = makeId();
      const photoId = makeId();
      const photo = makePhoto({
        _id: new Types.ObjectId(photoId),
        selected: true,
      });
      const session = makeSession();

      sessionModelMock.findById.mockResolvedValue(session);
      photoModelMock.findOne.mockResolvedValue(photo);
      photoModelMock.countDocuments.mockResolvedValue(2);

      const result = await service.selectPhoto(
        sessionId,
        photoId,
        'valid-token',
      );

      expect(result.selected).toBe(true);
      // save should NOT be called again — photo was already selected
      expect(photo.save).not.toHaveBeenCalled();
      expect(mockMongoSession.commitTransaction).not.toHaveBeenCalled();
    });
  });

  // ── deselectPhoto ───────────────────────────────────────────────────────────

  describe('deselectPhoto', () => {
    it('deselects a photo and returns updated count', async () => {
      const sessionId = makeId();
      const photoId = makeId();
      const photo = makePhoto({
        _id: new Types.ObjectId(photoId),
        selected: false,
      });
      sessionModelMock.findById.mockResolvedValue(makeSession());
      photoModelMock.findOneAndUpdate.mockResolvedValue(photo);
      photoModelMock.countDocuments.mockResolvedValue(1);

      const result = await service.deselectPhoto(
        sessionId,
        photoId,
        'valid-token',
      );

      expect(result.selected).toBe(false);
      expect(result.totalSelected).toBe(1);
    });

    it('throws ForbiddenException when session is CONFIRMED', async () => {
      const sessionId = makeId();
      const photoId = makeId();
      sessionModelMock.findById.mockResolvedValue(
        makeSession({ status: SessionStatus.CONFIRMED }),
      );

      await expect(
        service.deselectPhoto(sessionId, photoId, 'valid-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when photo is not found', async () => {
      const sessionId = makeId();
      const photoId = makeId();
      sessionModelMock.findById.mockResolvedValue(makeSession());
      photoModelMock.findOneAndUpdate.mockResolvedValue(null);

      await expect(
        service.deselectPhoto(sessionId, photoId, 'valid-token'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findBySession ───────────────────────────────────────────────────────────

  describe('findBySession', () => {
    it('returns photos sorted by orderNumber', async () => {
      const sessionId = makeId();
      const photos = [
        makePhoto({ orderNumber: 1 }),
        makePhoto({ orderNumber: 2 }),
      ];
      photoModelMock.find.mockReturnValue({
        sort: jest.fn().mockResolvedValue(photos),
      });

      const result = await service.findBySession(sessionId);

      expect(result).toHaveLength(2);
    });
  });
});
