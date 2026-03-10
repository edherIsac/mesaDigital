import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Session, SessionStatus } from './schemas/session.schema';
import { SessionsService } from './sessions.service';
import { PackagesService } from '../packages/packages.service';

// ─── helpers ────────────────────────────────────────────────────────────────

const makeId = () => new Types.ObjectId().toString();

function futureDate(daysFromNow = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function pastDate(daysAgo = 1): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function makeSession(overrides: Partial<Record<string, any>> = {}) {
  return {
    _id: new Types.ObjectId(),
    status: SessionStatus.ACTIVE,
    accessToken: 'token-abc',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days future
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('SessionsService', () => {
  let service: SessionsService;
  let sessionModelMock: any;
  let packagesServiceMock: any;

  beforeEach(async () => {
    sessionModelMock = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      updateMany: jest.fn(),
    };

    packagesServiceMock = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: getModelToken(Session.name), useValue: sessionModelMock },
        { provide: PackagesService, useValue: packagesServiceMock },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a session with correct maxPhotosAllowed from package', async () => {
      const studioId = makeId();
      const packageId = makeId();
      const pkg = { _id: packageId, maxPhotos: 10 };

      packagesServiceMock.findById.mockResolvedValue(pkg);
      sessionModelMock.create.mockResolvedValue({
        ...makeSession(),
        maxPhotosAllowed: 10,
        packageId: new Types.ObjectId(packageId),
      });

      const result = await service.create(studioId, {
        clientName: 'Ana García',
        clientEmail: 'ana@example.com',
        packageId,
        expiresAt: futureDate(7),
      });

      expect(result.maxPhotosAllowed).toBe(10);
      expect(packagesServiceMock.findById).toHaveBeenCalledWith(packageId);
    });

    it('generates a unique accessToken on creation', async () => {
      const studioId = makeId();
      const packageId = makeId();
      packagesServiceMock.findById.mockResolvedValue({ maxPhotos: 5 });

      const tokens = new Set<string>();
      sessionModelMock.create.mockImplementation((data: any) => {
        tokens.add(data.accessToken);
        return Promise.resolve({ ...makeSession(), ...data });
      });

      // Create two sessions and verify tokens differ
      await service.create(studioId, {
        clientName: 'Client A',
        clientEmail: 'a@a.com',
        packageId,
        expiresAt: futureDate(),
      });
      await service.create(studioId, {
        clientName: 'Client B',
        clientEmail: 'b@b.com',
        packageId,
        expiresAt: futureDate(),
      });

      expect(tokens.size).toBe(2);
    });

    it('throws BadRequestException when expiresAt is in the past', async () => {
      const studioId = makeId();

      await expect(
        service.create(studioId, {
          clientName: 'Test',
          clientEmail: 'test@test.com',
          packageId: makeId(),
          expiresAt: pastDate().toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when expiresAt is right now (not future)', async () => {
      const studioId = makeId();
      const nearPast = new Date(Date.now() - 1000).toISOString();

      await expect(
        service.create(studioId, {
          clientName: 'Test',
          clientEmail: 'test@test.com',
          packageId: makeId(),
          expiresAt: nearPast,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── validateToken ───────────────────────────────────────────────────────────

  describe('validateToken', () => {
    it('returns session when token is valid and not expired', async () => {
      const session = makeSession();
      sessionModelMock.findOne.mockResolvedValue(session);

      const result = await service.validateToken('token-abc');

      expect(result).toBe(session);
      expect(result.status).toBe(SessionStatus.ACTIVE);
    });

    it('auto-expires an ACTIVE session whose expiresAt is in the past', async () => {
      const session = makeSession({
        status: SessionStatus.ACTIVE,
        expiresAt: pastDate(1),
      });
      sessionModelMock.findOne.mockResolvedValue(session);

      const result = await service.validateToken('token-abc');

      expect(result.status).toBe(SessionStatus.EXPIRED);
      expect(session.save).toHaveBeenCalled();
    });

    it('does NOT change status of a CONFIRMED session even if past expiresAt', async () => {
      const session = makeSession({
        status: SessionStatus.CONFIRMED,
        expiresAt: pastDate(3),
      });
      sessionModelMock.findOne.mockResolvedValue(session);

      const result = await service.validateToken('token-abc');

      // Status must stay CONFIRMED — only ACTIVE sessions get auto-expired
      expect(result.status).toBe(SessionStatus.CONFIRMED);
      expect(session.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown token', async () => {
      sessionModelMock.findOne.mockResolvedValue(null);

      await expect(service.validateToken('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── confirm ─────────────────────────────────────────────────────────────────

  describe('confirm', () => {
    it('confirms an ACTIVE session', async () => {
      const session = makeSession();
      sessionModelMock.findById.mockResolvedValue(session);

      const result = await service.confirm(session._id.toString(), 'token-abc');

      expect(result.status).toBe(SessionStatus.CONFIRMED);
      expect(session.save).toHaveBeenCalled();
    });

    it('throws ForbiddenException when session is already CONFIRMED', async () => {
      const session = makeSession({ status: SessionStatus.CONFIRMED });
      sessionModelMock.findById.mockResolvedValue(session);

      await expect(
        service.confirm(session._id.toString(), 'token-abc'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when session is EXPIRED', async () => {
      const session = makeSession({ status: SessionStatus.EXPIRED });
      sessionModelMock.findById.mockResolvedValue(session);

      await expect(
        service.confirm(session._id.toString(), 'token-abc'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException for wrong accessToken', async () => {
      const session = makeSession({ accessToken: 'correct-token' });
      sessionModelMock.findById.mockResolvedValue(session);

      await expect(
        service.confirm(session._id.toString(), 'wrong-token'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── updateStatus ─────────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it.each([SessionStatus.EDITING, SessionStatus.DONE, SessionStatus.EXPIRED])(
      'allows transitioning to %s',
      async (targetStatus) => {
        const session = makeSession({
          save: jest.fn().mockResolvedValue({ status: targetStatus }),
        });
        sessionModelMock.findById.mockResolvedValue(session);

        await service.updateStatus(session._id.toString(), {
          status: targetStatus,
        });

        expect(session.status).toBe(targetStatus);
        expect(session.save).toHaveBeenCalled();
      },
    );

    it('throws BadRequestException for invalid status transition (ACTIVE)', async () => {
      const session = makeSession();
      sessionModelMock.findById.mockResolvedValue(session);

      await expect(
        service.updateStatus(session._id.toString(), {
          status: SessionStatus.ACTIVE as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for CONFIRMED transition via studio', async () => {
      const session = makeSession();
      sessionModelMock.findById.mockResolvedValue(session);

      await expect(
        service.updateStatus(session._id.toString(), {
          status: SessionStatus.CONFIRMED as any,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── autoExpireSessions (cron) ───────────────────────────────────────────────

  describe('autoExpireSessions', () => {
    it('calls updateMany with correct filter to expire overdue sessions', async () => {
      sessionModelMock.updateMany.mockResolvedValue({ modifiedCount: 2 });

      await service.autoExpireSessions();

      const [filter, update] = sessionModelMock.updateMany.mock.calls[0];
      expect(filter.status).toBe(SessionStatus.ACTIVE);
      expect(filter.expiresAt.$lt).toBeInstanceOf(Date);
      expect(update.$set.status).toBe(SessionStatus.EXPIRED);
    });

    it('does nothing when no sessions need expiring', async () => {
      sessionModelMock.updateMany.mockResolvedValue({ modifiedCount: 0 });

      await expect(service.autoExpireSessions()).resolves.not.toThrow();
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('returns a session when found', async () => {
      const session = makeSession();
      sessionModelMock.findById.mockResolvedValue(session);

      const result = await service.findById(session._id.toString());

      expect(result).toBe(session);
    });

    it('throws NotFoundException when session does not exist', async () => {
      sessionModelMock.findById.mockResolvedValue(null);

      await expect(service.findById(makeId())).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
