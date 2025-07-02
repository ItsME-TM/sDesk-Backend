import { Test, TestingModule } from '@nestjs/testing';
import { TeamController } from '../team.controller';
import { TeamService } from '../team.service';
import { CreateTeamDto, UpdateTeamDto } from '../dto/team.dto';
import { Team } from '../entities/team.entity';

describe('TeamController', () => {
  let controller: TeamController;
  let service: TeamService;

  const mockTeam: Team = {
    id: 1,
    name: 'Test Team',
    description: 'Test Description',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTeams: Team[] = [
    mockTeam,
    {
      id: 2,
      name: 'Test Team 2',
      description: 'Test Description 2',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockTeamService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [
        {
          provide: TeamService,
          useValue: mockTeamService,
        },
      ],
    }).compile();

    controller = module.get<TeamController>(TeamController);
    service = module.get<TeamService>(TeamService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new team', async () => {
      const createTeamDto: CreateTeamDto = {
        name: 'New Team',
        description: 'New Description',
      };

      mockTeamService.create.mockResolvedValue(mockTeam);

      const result = await controller.create(createTeamDto);

      expect(service.create).toHaveBeenCalledWith(createTeamDto);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTeam);
    });

    it('should handle service errors during creation', async () => {
      const createTeamDto: CreateTeamDto = {
        name: 'New Team',
        description: 'New Description',
      };

      const error = new Error('Creation failed');
      mockTeamService.create.mockRejectedValue(error);

      await expect(controller.create(createTeamDto)).rejects.toThrow('Creation failed');
      expect(service.create).toHaveBeenCalledWith(createTeamDto);
    });
  });

  describe('findAll', () => {
    it('should return an array of teams', async () => {
      mockTeamService.findAll.mockResolvedValue(mockTeams);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTeams);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no teams exist', async () => {
      mockTeamService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle service errors during findAll', async () => {
      const error = new Error('Database connection failed');
      mockTeamService.findAll.mockRejectedValue(error);

      await expect(controller.findAll()).rejects.toThrow('Database connection failed');
      expect(service.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a single team by id', async () => {
      const teamId = '1';
      mockTeamService.findOne.mockResolvedValue(mockTeam);

      const result = await controller.findOne(teamId);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(service.findOne).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTeam);
    });

    it('should handle non-existent team', async () => {
      const teamId = '999';
      const error = new Error('Team not found');
      mockTeamService.findOne.mockRejectedValue(error);

      await expect(controller.findOne(teamId)).rejects.toThrow('Team not found');
      expect(service.findOne).toHaveBeenCalledWith(999);
    });

    it('should convert string id to number', async () => {
      const teamId = '5';
      mockTeamService.findOne.mockResolvedValue(mockTeam);

      await controller.findOne(teamId);

      expect(service.findOne).toHaveBeenCalledWith(5);
    });
  });

  describe('update', () => {
    it('should update a team successfully', async () => {
      const teamId = '1';
      const updateTeamDto: UpdateTeamDto = {
        name: 'Updated Team Name',
        description: 'Updated Description',
      };

      const updatedTeam = { ...mockTeam, ...updateTeamDto };
      mockTeamService.update.mockResolvedValue(updatedTeam);

      const result = await controller.update(teamId, updateTeamDto);

      expect(service.update).toHaveBeenCalledWith(1, updateTeamDto);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updatedTeam);
    });

    it('should handle partial updates', async () => {
      const teamId = '1';
      const updateTeamDto: UpdateTeamDto = {
        name: 'Only Name Updated',
      };

      const updatedTeam = { ...mockTeam, name: 'Only Name Updated' };
      mockTeamService.update.mockResolvedValue(updatedTeam);

      const result = await controller.update(teamId, updateTeamDto);

      expect(service.update).toHaveBeenCalledWith(1, updateTeamDto);
      expect(result).toEqual(updatedTeam);
    });

    it('should handle update errors', async () => {
      const teamId = '1';
      const updateTeamDto: UpdateTeamDto = {
        name: 'Updated Team Name',
      };

      const error = new Error('Update failed');
      mockTeamService.update.mockRejectedValue(error);

      await expect(controller.update(teamId, updateTeamDto)).rejects.toThrow('Update failed');
      expect(service.update).toHaveBeenCalledWith(1, updateTeamDto);
    });

    it('should convert string teamId to number', async () => {
      const teamId = '10';
      const updateTeamDto: UpdateTeamDto = {
        name: 'Updated Team Name',
      };

      mockTeamService.update.mockResolvedValue(mockTeam);

      await controller.update(teamId, updateTeamDto);

      expect(service.update).toHaveBeenCalledWith(10, updateTeamDto);
    });
  });

  describe('remove', () => {
    it('should remove a team successfully', async () => {
      const teamId = '1';
      mockTeamService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(teamId);

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(service.remove).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should handle removal errors', async () => {
      const teamId = '1';
      const error = new Error('Deletion failed');
      mockTeamService.remove.mockRejectedValue(error);

      await expect(controller.remove(teamId)).rejects.toThrow('Deletion failed');
      expect(service.remove).toHaveBeenCalledWith(1);
    });

    it('should convert string teamId to number', async () => {
      const teamId = '15';
      mockTeamService.remove.mockResolvedValue(undefined);

      await controller.remove(teamId);

      expect(service.remove).toHaveBeenCalledWith(15);
    });

    it('should handle non-existent team removal', async () => {
      const teamId = '999';
      const error = new Error('Team not found');
      mockTeamService.remove.mockRejectedValue(error);

      await expect(controller.remove(teamId)).rejects.toThrow('Team not found');
      expect(service.remove).toHaveBeenCalledWith(999);
    });
  });
});