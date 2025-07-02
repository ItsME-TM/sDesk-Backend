import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { TeamAdminService } from '../teamadmin.service';
import { TeamAdmin } from '../entities/teamadmin.entity';
import { TeamAdminDto } from '../dto/teamadmin-dto';

describe('TeamAdminService', () => {
  let service: TeamAdminService;
  let repository: Repository<TeamAdmin>;

  let loggerSpy: jest.SpyInstance;

  const mockTeamAdmin: TeamAdmin = {
    id: 'test-uuid-123',
    serviceNumber: 'SN001',
    userName: 'John Doe',
    contactNumber: 'TP001',
    designation: 'Senior Developer',
    email: 'john@example.com',
    cat1: 'cat1',
    cat2: 'cat2',
    cat3: 'cat3',
    cat4: 'cat4',
    active: true,
    assignAfterSignOff: false,
    teamId: 'team-123',
    teamName: 'Team Alpha',
    assignedAt: new Date('2024-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockTeamAdminDto: TeamAdminDto = {
    serviceNumber: 'SN001',
    userName: 'John Doe',
    contactNumber: 'TP001',
    designation: 'Senior Developer',
    email: 'john@example.com',
    cat1: 'cat1',
    cat2: 'cat2',
    cat3: 'cat3',
    cat4: 'cat4',
    active: true,
    assignAfterSignOff: false,
    teamId: 'team-123',
    teamName: 'Team Alpha',
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeAll(() => {
    loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
  });

  afterAll(() => {
    loggerSpy.mockRestore();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamAdminService,
        {
          provide: getRepositoryToken(TeamAdmin),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TeamAdminService>(TeamAdminService);
    repository = module.get<Repository<TeamAdmin>>(
      getRepositoryToken(TeamAdmin),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTeamAdmin', () => {
    it('should create a team admin successfully', async () => {
      mockRepository.create.mockReturnValue(mockTeamAdmin);
      mockRepository.save.mockResolvedValue(mockTeamAdmin);
      const result = await service.createTeamAdmin(mockTeamAdminDto);
      expect(mockRepository.create).toHaveBeenCalledWith(mockTeamAdminDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockTeamAdmin);
      expect(result).toEqual(mockTeamAdmin);
    });

    it('should throw InternalServerErrorException when save fails', async () => {
      const originalError = new Error('Database error');
      mockRepository.create.mockReturnValue(mockTeamAdmin);
      mockRepository.save.mockRejectedValue(originalError);

      await expect(service.createTeamAdmin(mockTeamAdminDto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.createTeamAdmin(mockTeamAdminDto)).rejects.toThrow(
        `Failed to create team admin: ${originalError.message}`,
      );
    });
  });

  describe('findAllTeamAdmins', () => {
    it('should return all team admins', async () => {
      const teamAdmins = [mockTeamAdmin];
      mockRepository.find.mockResolvedValue(teamAdmins);

      const result = await service.findAllTeamAdmins();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(teamAdmins);
    });

    it('should return empty array when no team admins found', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAllTeamAdmins();

      expect(result).toEqual([]);
    });

    it('should throw InternalServerErrorException when findAllTeamAdmins fails', async () => {
      const originalError = new Error('Network error');
      mockRepository.find.mockRejectedValue(originalError);

      await expect(service.findAllTeamAdmins()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findAllTeamAdmins()).rejects.toThrow(
        `Failed to retrieve team admins: ${originalError.message}`,
      );
    });
  });

  describe('findTeamAdminByTeamId', () => {
    it('should return team admin by team id', async () => {
      mockRepository.findOne.mockResolvedValue(mockTeamAdmin);

      const result = await service.findTeamAdminByTeamId('team-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
      });
      expect(result).toEqual(mockTeamAdmin);
    });

    it('should return null when team admin not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findTeamAdminByTeamId('non-existent-team');

      expect(result).toBeNull();
    });

    it('should throw InternalServerErrorException when findTeamAdminByTeamId fails', async () => {
      const originalError = new Error('Database connection issue');
      mockRepository.findOne.mockRejectedValue(originalError);

      await expect(service.findTeamAdminByTeamId('team-123')).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.findTeamAdminByTeamId('team-123')).rejects.toThrow(
        `Failed to find team admin by teamId team-123: ${originalError.message}`,
      );
    });
  });

  describe('updateTeamAdminByTeamId', () => {
    it('should update team admin by team id successfully', async () => {
      const updatedData = { ...mockTeamAdminDto, userName: 'Updated Name' };
      const updatedAdmin = { ...mockTeamAdmin, userName: 'Updated Name' };

      mockRepository.findOne.mockResolvedValue(mockTeamAdmin);
      mockRepository.save.mockResolvedValue(updatedAdmin);

      const result = await service.updateTeamAdminByTeamId(
        'team-123',
        updatedData,
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(updatedAdmin);
    });

    it('should throw NotFoundException when team admin not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateTeamAdminByTeamId('non-existent-team', mockTeamAdminDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when updateTeamAdminByTeamId save fails', async () => {
      const originalError = new Error('Save failed');
      mockRepository.findOne.mockResolvedValue(mockTeamAdmin);
      mockRepository.save.mockRejectedValue(originalError);

      await expect(
        service.updateTeamAdminByTeamId('team-123', mockTeamAdminDto),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.updateTeamAdminByTeamId('team-123', mockTeamAdminDto),
      ).rejects.toThrow(
        `Failed to update team admin with teamId team-123: ${originalError.message}`,
      );
    });
  });

  describe('removeTeamAdminByTeamId', () => {
    it('should remove team admin by team id successfully', async () => {
      mockRepository.findOne.mockResolvedValue(mockTeamAdmin);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.removeTeamAdminByTeamId('team-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { teamId: 'team-123' },
      });
      expect(mockRepository.delete).toHaveBeenCalledWith({
        teamId: 'team-123',
      });
    });

    it('should throw NotFoundException when team admin not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeTeamAdminByTeamId('non-existent-team'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when delete fails (affected: 0)', async () => {
      mockRepository.findOne.mockResolvedValue(mockTeamAdmin);
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.removeTeamAdminByTeamId('team-123')).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.removeTeamAdminByTeamId('team-123')).rejects.toThrow(
        `Failed to delete team admin with teamId team-123`,
      );
    });

    it('should throw InternalServerErrorException for general database errors during removeTeamAdminByTeamId', async () => {
      const originalError = new Error('Database connection lost');
      mockRepository.findOne.mockResolvedValue(mockTeamAdmin);
      mockRepository.delete.mockRejectedValue(originalError);

      await expect(service.removeTeamAdminByTeamId('team-123')).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.removeTeamAdminByTeamId('team-123')).rejects.toThrow(
        `Failed to delete team admin: ${originalError.message}`,
      );
    });
  });
});
