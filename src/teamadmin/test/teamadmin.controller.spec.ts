import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { TeamAdminController } from '../teamadmin.controller';
import { TeamAdminService } from '../teamadmin.service';
import { TeamAdmin } from '../entities/teamadmin.entity';
import { TeamAdminDto } from '../dto/teamadmin-dto';

describe('TeamAdminController', () => {
  let controller: TeamAdminController;
  let service: TeamAdminService;
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

  const mockTeamAdminService = {
    createTeamAdmin: jest.fn(),
    findAllTeamAdmins: jest.fn(),
    updateTeamAdminByTeamId: jest.fn(),
    removeTeamAdminByTeamId: jest.fn(),
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
      controllers: [TeamAdminController],
      providers: [
        {
          provide: TeamAdminService,
          useValue: mockTeamAdminService,
        },
      ],
    }).compile();

    controller = module.get<TeamAdminController>(TeamAdminController);
    service = module.get<TeamAdminService>(TeamAdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTeamAdmin (Controller Method)', () => {
    it('should create a team admin successfully', async () => {
      mockTeamAdminService.createTeamAdmin.mockResolvedValue(mockTeamAdmin);
      const result = await controller.createTeamAdmin(mockTeamAdminDto);
      expect(mockTeamAdminService.createTeamAdmin).toHaveBeenCalledWith(
        mockTeamAdminDto,
      );
      expect(result).toEqual(mockTeamAdmin);
    });
    it('should throw HttpException when service fails', async () => {
      const error = new Error('Database error');
      mockTeamAdminService.createTeamAdmin.mockRejectedValue(error);
      await expect(
        controller.createTeamAdmin(mockTeamAdminDto),
      ).rejects.toThrow(HttpException);
      try {
        await controller.createTeamAdmin(mockTeamAdminDto);
      } catch (e) {
        const err = e as any;
        expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(err.message).toContain('Failed to create team admin');
      }
    });
  });

  describe('getAllTeamAdmins (Controller Method)', () => {
    it('should return all team admins', async () => {
      const teamAdmins = [mockTeamAdmin];
      mockTeamAdminService.findAllTeamAdmins.mockResolvedValue(teamAdmins);

      const result = await controller.getAllTeamAdmins();

      expect(mockTeamAdminService.findAllTeamAdmins).toHaveBeenCalled();
      expect(result).toEqual(teamAdmins);
    });

    it('should return empty array when no team admins found', async () => {
      mockTeamAdminService.findAllTeamAdmins.mockResolvedValue([]);

      const result = await controller.getAllTeamAdmins();

      expect(result).toEqual([]);
    });

    it('should throw HttpException when service fails', async () => {
      const error = new Error('Database error');
      mockTeamAdminService.findAllTeamAdmins.mockRejectedValue(error);

      await expect(controller.getAllTeamAdmins()).rejects.toThrow(
        HttpException,
      );

      try {
        await controller.getAllTeamAdmins();
      } catch (e) {
        const err = e as any;
        expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(err.message).toContain('Failed to retrieve team admins');
      }
    });
  });

  describe('updateTeamAdminByTeamId (Controller Method)', () => {
    const teamId = 'team-123';

    it('should update team admin successfully', async () => {
      const updatedAdmin = { ...mockTeamAdmin, userName: 'Updated Name' };
      mockTeamAdminService.updateTeamAdminByTeamId.mockResolvedValue(
        updatedAdmin,
      );

      const result = await controller.updateTeamAdminByTeamId(
        teamId,
        mockTeamAdminDto,
      );

      expect(mockTeamAdminService.updateTeamAdminByTeamId).toHaveBeenCalledWith(
        teamId,
        mockTeamAdminDto,
      );
      expect(result).toEqual(updatedAdmin);
    });

    it('should throw NOT_FOUND when service throws NotFoundException', async () => {
      const notFound = new HttpException('Not found', HttpStatus.NOT_FOUND);
      mockTeamAdminService.updateTeamAdminByTeamId.mockRejectedValue(notFound);

      await expect(
        controller.updateTeamAdminByTeamId(teamId, mockTeamAdminDto),
      ).rejects.toThrow(HttpException);

      try {
        await controller.updateTeamAdminByTeamId(teamId, mockTeamAdminDto);
      } catch (e) {
        const err = e as any;
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for non-HttpException errors', async () => {
      const error = new Error('Database error');
      mockTeamAdminService.updateTeamAdminByTeamId.mockRejectedValue(error);

      await expect(
        controller.updateTeamAdminByTeamId(teamId, mockTeamAdminDto),
      ).rejects.toThrow(HttpException);

      try {
        await controller.updateTeamAdminByTeamId(teamId, mockTeamAdminDto);
      } catch (e) {
        const err = e as any;
        expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(err.message).toContain('Failed to update team admin');
      }
    });
  });

  describe('deleteTeamAdminByTeamId (Controller Method)', () => {
    const teamId = 'team-123';

    it('should delete team admin successfully', async () => {
      mockTeamAdminService.removeTeamAdminByTeamId.mockResolvedValue(undefined);

      const result = await controller.deleteTeamAdminByTeamId(teamId);

      expect(mockTeamAdminService.removeTeamAdminByTeamId).toHaveBeenCalledWith(
        teamId,
      );
      expect(result).toEqual({
        message: `Team admin with teamId ${teamId} successfully deleted`,
      });
    });

    it('should throw NOT_FOUND when service throws NotFoundException', async () => {
      const notFound = new HttpException('Not found', HttpStatus.NOT_FOUND);
      mockTeamAdminService.removeTeamAdminByTeamId.mockRejectedValue(notFound);

      await expect(controller.deleteTeamAdminByTeamId(teamId)).rejects.toThrow(
        HttpException,
      );

      try {
        await controller.deleteTeamAdminByTeamId(teamId);
      } catch (e) {
        const err = e as any;
        expect(err.getStatus()).toBe(HttpStatus.NOT_FOUND);
      }
    });

    it('should throw INTERNAL_SERVER_ERROR for non-HttpException errors', async () => {
      const error = new Error('Database error');
      mockTeamAdminService.removeTeamAdminByTeamId.mockRejectedValue(error);

      await expect(controller.deleteTeamAdminByTeamId(teamId)).rejects.toThrow(
        HttpException,
      );

      try {
        await controller.deleteTeamAdminByTeamId(teamId);
      } catch (e) {
        const err = e as any;
        expect(err.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(err.message).toContain('Failed to delete team admin');
      }
    });
  });
});
