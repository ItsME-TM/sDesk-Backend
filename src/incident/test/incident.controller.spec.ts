import { Test, TestingModule } from '@nestjs/testing';
import { IncidentController } from '../incident.controller';
import { IncidentService } from '../incident.service';
import { IncidentDto } from '../dto/incident.dto';
import {
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { IncidentStatus, IncidentPriority } from '../entities/incident.entity';

//npx jest src/incident/test/incident.controller.spec.ts --verbose --coverage

describe('IncidentController', () => {
  let controller: IncidentController;
  let service: IncidentService;

  const mockIncidentDto = {
    informant: 'SV001',
    location: 'LOC_2',
    handler: 'SV010',
    category: 'CAT015',
    status: IncidentStatus.OPEN,
    priority: IncidentPriority.CRITICAL,
    description: 'Laptop not turning on.',
  };

  const mockIncident = {
    incident_number: 'IN1',
    ...mockIncidentDto,
  };

  const mockIncident2 = {
    incident_number: 'IN2',
    ...mockIncidentDto,
    informant: 'SV002',
  };

  const mockIncidentService = {
    create: jest.fn(),
    getAssignedToMe: jest.fn(),
    getAssignedByMe: jest.fn(),
    getAll: jest.fn(),
    getByCategory: jest.fn(),
    update: jest.fn(),
    getIncidentByNumber: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidentController],
      providers: [
        {
          provide: IncidentService,
          useValue: mockIncidentService,
        },
      ],
    }).compile();

    controller = module.get<IncidentController>(IncidentController);
    service = module.get<IncidentService>(IncidentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an incident successfully', async () => {
      mockIncidentService.create.mockResolvedValue(mockIncident);
      const result = await controller.create(mockIncidentDto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(service.create).toHaveBeenCalledWith(mockIncidentDto);
      expect(result).toEqual(mockIncident);
    });

    it('should propagate BadRequestException from service (try-catch)', async () => {
      mockIncidentService.create.mockRejectedValue(
        new BadRequestException('Missing required field: informant'),
      );
      await expect(
        controller.create({
          ...mockIncidentDto,
          informant: undefined,
        } as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.create({
          ...mockIncidentDto,
          informant: undefined,
        } as unknown as IncidentDto),
      ).rejects.toThrow('Missing required field: informant');
    });

    it('should propagate InternalServerErrorException from service (try-catch)', async () => {
      mockIncidentService.create.mockRejectedValue(
        new InternalServerErrorException('Failed to create incident'),
      );
      await expect(controller.create(mockIncidentDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getAssignedToMe', () => {
    it('should return incidents assigned to handler', async () => {
      const incidents = [mockIncident];
      mockIncidentService.getAssignedToMe.mockResolvedValue(incidents);
      const result = await controller.getAssignedToMe({
        handler: 'SV010',
      } as unknown as IncidentDto);
      expect(mockIncidentService.getAssignedToMe).toHaveBeenCalledWith({
        handler: 'SV010',
      } as unknown as IncidentDto);
      expect(result).toEqual(incidents);
    });

    it('should propagate BadRequestException from service (try-catch)', async () => {
      mockIncidentService.getAssignedToMe.mockRejectedValue(
        new BadRequestException('handler is required'),
      );
      await expect(
        controller.getAssignedToMe({
          handler: undefined,
        } as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.getAssignedToMe({
          handler: undefined,
        } as unknown as IncidentDto),
      ).rejects.toThrow('handler is required');
    });

    it('should propagate InternalServerErrorException from service (try-catch)', async () => {
      mockIncidentService.getAssignedToMe.mockRejectedValue(
        new InternalServerErrorException('Failed to retrieve incidents'),
      );
      await expect(
        controller.getAssignedToMe({
          handler: 'SV010',
        } as unknown as IncidentDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getAssignedByMe', () => {
    it('should return incidents assigned by informant', async () => {
      const incidents = [mockIncident];
      mockIncidentService.getAssignedByMe.mockResolvedValue(incidents);
      const result = await controller.getAssignedByMe({
        informant: 'SV001',
      } as unknown as IncidentDto);
      expect(mockIncidentService.getAssignedByMe).toHaveBeenCalledWith({
        informant: 'SV001',
      } as unknown as IncidentDto);
      expect(result).toEqual(incidents);
    });

    it('should propagate BadRequestException from service (try-catch)', async () => {
      mockIncidentService.getAssignedByMe.mockRejectedValue(
        new BadRequestException('informant is required'),
      );
      await expect(
        controller.getAssignedByMe({
          informant: undefined,
        } as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.getAssignedByMe({
          informant: undefined,
        } as unknown as IncidentDto),
      ).rejects.toThrow('informant is required');
    });

    it('should propagate InternalServerErrorException from service (try-catch)', async () => {
      mockIncidentService.getAssignedByMe.mockRejectedValue(
        new InternalServerErrorException(
          'Failed to retrieve incidents assigned by informant',
        ),
      );
      await expect(
        controller.getAssignedByMe({
          informant: 'SV001',
        } as unknown as IncidentDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getAll', () => {
    it('should return all incidents', async () => {
      const incidents = [mockIncident, mockIncident2];
      mockIncidentService.getAll.mockResolvedValue(incidents);
      const result = await controller.getAll();
      expect(mockIncidentService.getAll).toHaveBeenCalled();
      expect(result).toEqual(incidents);
    });

    it('should propagate InternalServerErrorException from service (try-catch)', async () => {
      mockIncidentService.getAll.mockRejectedValue(
        new InternalServerErrorException('Failed to retrieve all incidents'),
      );
      await expect(controller.getAll()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getByCategory', () => {
    it('should return incidents by category', async () => {
      const incidents = [mockIncident];
      mockIncidentService.getByCategory.mockResolvedValue(incidents);
      const result = await controller.getByCategory({
        category: 'CAT015',
      } as unknown as IncidentDto);
      expect(mockIncidentService.getByCategory).toHaveBeenCalledWith({
        category: 'CAT015',
      } as unknown as IncidentDto);
      expect(result).toEqual(incidents);
    });

    it('should propagate BadRequestException from service (try-catch)', async () => {
      mockIncidentService.getByCategory.mockRejectedValue(
        new BadRequestException('category is required'),
      );
      await expect(
        controller.getByCategory({
          category: undefined,
        } as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.getByCategory({
          category: undefined,
        } as unknown as IncidentDto),
      ).rejects.toThrow('category is required');
    });

    it('should propagate InternalServerErrorException from service (try-catch)', async () => {
      mockIncidentService.getByCategory.mockRejectedValue(
        new InternalServerErrorException(
          'Failed to retrieve incidents by category',
        ),
      );
      await expect(
        controller.getByCategory({
          category: 'CAT015',
        } as unknown as IncidentDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('update', () => {
    it('should update an incident successfully', async () => {
      mockIncidentService.update.mockResolvedValue(mockIncident);
      const result = await controller.update('IN1', mockIncidentDto);
      expect(mockIncidentService.update).toHaveBeenCalledWith(
        'IN1',
        mockIncidentDto,
      );
      expect(result).toEqual(mockIncident);
    });

    it('should propagate NotFoundException from service (try-catch)', async () => {
      mockIncidentService.update.mockRejectedValue(
        new NotFoundException('Incident not found'),
      );
      await expect(controller.update('IN999', mockIncidentDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.update('IN999', mockIncidentDto)).rejects.toThrow(
        'Incident not found',
      );
    });

    it('should propagate BadRequestException from service (try-catch)', async () => {
      mockIncidentService.update.mockRejectedValue(
        new BadRequestException('At least one field is required to update'),
      );
      await expect(controller.update('IN1', {} as IncidentDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.update('IN1', {} as IncidentDto)).rejects.toThrow(
        'At least one field is required to update',
      );
    });

    it('should propagate InternalServerErrorException from service (try-catch)', async () => {
      mockIncidentService.update.mockRejectedValue(
        new InternalServerErrorException('Failed to update incident'),
      );
      await expect(controller.update('IN1', mockIncidentDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getIncidentByNumber', () => {
    it('should return an incident by number', async () => {
      mockIncidentService.getIncidentByNumber.mockResolvedValue(mockIncident);
      const result = await controller.getIncidentByNumber('IN1');
      expect(mockIncidentService.getIncidentByNumber).toHaveBeenCalledWith(
        'IN1',
      );
      expect(result).toEqual(mockIncident);
    });

    it('should propagate NotFoundException from service (try-catch)', async () => {
      mockIncidentService.getIncidentByNumber.mockRejectedValue(
        new NotFoundException('Incident not found'),
      );
      await expect(controller.getIncidentByNumber('IN999')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getIncidentByNumber('IN999')).rejects.toThrow(
        'Incident not found',
      );
    });

    it('should propagate InternalServerErrorException from service (try-catch)', async () => {
      mockIncidentService.getIncidentByNumber.mockRejectedValue(
        new InternalServerErrorException('Failed to retrieve incident'),
      );
      await expect(controller.getIncidentByNumber('IN1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
