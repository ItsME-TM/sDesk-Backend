// src/team/test/team.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { TeamService } from '../team.service';
import { Team } from '../entities/team.entity';
import { CreateTeamDto, UpdateTeamDto } from '../dto/team.dto';

describe('TeamService', () => {
  let service: TeamService;
  let repository: Repository<Team>;

  const mockTeam: Team = {
    id: 1,
    name: 'Test Team',
    description: 'Test Description',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: getRepositoryToken(Team),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
    repository = module.get<Repository<Team>>(getRepositoryToken(Team));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('create', () => {
    const createTeamDto: CreateTeamDto = {
      name: 'New Team',
      description: 'New Description',
    };

    it('should create a team successfully', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockTeam);
      mockRepository.save.mockResolvedValue(mockTeam);

      const result = await service.create(createTeamDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: createTeamDto.name },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(createTeamDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockTeam);
      expect(result).toEqual(mockTeam);
    });

    it('should throw BadRequestException when createTeamDto is null', async () => {
      await expect(service.create(null as any)).rejects.toThrow(
        new BadRequestException('Team name is required'),
      );
    });

    it('should throw BadRequestException when name is missing', async () => {
      const invalidDto = { description: 'Test' } as CreateTeamDto;
      
      await expect(service.create(invalidDto)).rejects.toThrow(
        new BadRequestException('Team name is required'),
      );
    });

    it('should throw BadRequestException when name is empty string', async () => {
      const invalidDto: CreateTeamDto = { name: '', description: 'Test' };
      
      await expect(service.create(invalidDto)).rejects.toThrow(
        new BadRequestException('Team name is required'),
      );
    });

    it('should throw ConflictException when team with same name exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockTeam);

      await expect(service.create(createTeamDto)).rejects.toThrow(
        new ConflictException('Team with this name already exists'),
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of teams', async () => {
      const teams = [mockTeam];
      mockRepository.find.mockResolvedValue(teams);

      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(teams);
    });

    it('should return empty array when no teams exist', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a team when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockTeam);

      const result = await service.findOne(1);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockTeam);
    });

    it('should throw BadRequestException for invalid ID (null)', async () => {
      await expect(service.findOne(null as any)).rejects.toThrow(
        new BadRequestException('Invalid team ID'),
      );
    });

    it('should throw BadRequestException for invalid ID (undefined)', async () => {
      await expect(service.findOne(undefined as any)).rejects.toThrow(
        new BadRequestException('Invalid team ID'),
      );
    });

    it('should throw BadRequestException for invalid ID (zero)', async () => {
      await expect(service.findOne(0)).rejects.toThrow(
        new BadRequestException('Invalid team ID'),
      );
    });

    it('should throw BadRequestException for invalid ID (negative)', async () => {
      await expect(service.findOne(-1)).rejects.toThrow(
        new BadRequestException('Invalid team ID'),
      );
    });

    it('should throw NotFoundException when team not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        new NotFoundException('Team with ID 999 not found'),
      );
    });
  });

  describe('update', () => {
    const updateTeamDto: UpdateTeamDto = {
      name: 'Updated Team',
      description: 'Updated Description',
    };

    it('should update a team successfully', async () => {
      const updatedTeam = { ...mockTeam, ...updateTeamDto };
      
      // Mock findOne method to return the team for ID validation
      jest.spyOn(service, 'findOne').mockResolvedValue(mockTeam);
      // Mock repository findOne for name uniqueness check
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.save.mockResolvedValue(updatedTeam);

      const result = await service.update(1, updateTeamDto);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: updateTeamDto.name }
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockTeam,
        ...updateTeamDto,
      });
      expect(result).toEqual(updatedTeam);
    });

    it('should update team without checking name uniqueness when name is not changed', async () => {
      const updateDto: UpdateTeamDto = { description: 'New Description' };
      const updatedTeam = { ...mockTeam, description: 'New Description' };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockTeam);
      mockRepository.save.mockResolvedValue(updatedTeam);

      const result = await service.update(1, updateDto);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(mockRepository.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(updatedTeam);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.update(0, updateTeamDto)).rejects.toThrow(
        new BadRequestException('Invalid team ID'),
      );
    });

    it('should throw BadRequestException when updateTeamDto is null', async () => {
      await expect(service.update(1, null as any)).rejects.toThrow(
        new BadRequestException('At least one field must be provided for update'),
      );
    });

    it('should throw BadRequestException when updateTeamDto is empty', async () => {
      await expect(service.update(1, {})).rejects.toThrow(
        new BadRequestException('At least one field must be provided for update'),
      );
    });

    it('should throw NotFoundException when team to update does not exist', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(
        new NotFoundException('Team with ID 999 not found')
      );

      await expect(service.update(999, updateTeamDto)).rejects.toThrow(
        new NotFoundException('Team with ID 999 not found'),
      );
    });

    it('should throw ConflictException when new name already exists', async () => {
      const existingTeamWithSameName = { ...mockTeam, id: 2, name: 'Updated Team' };
      
      // Mock findOne method to return the team for ID validation
      jest.spyOn(service, 'findOne').mockResolvedValue(mockTeam);
      // Mock repository findOne for name uniqueness check to return existing team
      mockRepository.findOne.mockResolvedValue(existingTeamWithSameName);

      await expect(service.update(1, updateTeamDto)).rejects.toThrow(
        new ConflictException('Team with this name already exists'),
      );
      
      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Updated Team' }
      });
    });

    it('should allow updating with same name (no change)', async () => {
      const updateDto: UpdateTeamDto = { 
        name: mockTeam.name, 
        description: 'New Description' 
      };
      const updatedTeam = { ...mockTeam, description: 'New Description' };
      
      jest.spyOn(service, 'findOne').mockResolvedValue(mockTeam);
      mockRepository.save.mockResolvedValue(updatedTeam);

      const result = await service.update(1, updateDto);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(mockRepository.findOne).not.toHaveBeenCalled(); // No name uniqueness check needed
      expect(result).toEqual(updatedTeam);
    });
  });

  describe('remove', () => {
    it('should remove a team successfully', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockTeam);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      await service.remove(1);

      expect(service.findOne).toHaveBeenCalledWith(1);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.remove(0)).rejects.toThrow(
        new BadRequestException('Invalid team ID'),
      );
    });

    it('should throw NotFoundException when team to remove does not exist', async () => {
      jest.spyOn(service, 'findOne').mockRejectedValue(
        new NotFoundException('Team with ID 999 not found')
      );

      await expect(service.remove(999)).rejects.toThrow(
        new NotFoundException('Team with ID 999 not found'),
      );
    });

    it('should throw NotFoundException when delete operation affects no rows', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockTeam);
      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(1)).rejects.toThrow(
        new NotFoundException('Team with ID 1 not found'),
      );
    });
  });
});