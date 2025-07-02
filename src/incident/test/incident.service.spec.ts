import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidentService } from '../incident.service';
import { Incident } from '../entities/incident.entity';
import { IncidentDto } from '../dto/incident.dto';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus, IncidentPriority } from '../entities/incident.entity';

//npx jest src/incident/test/incident.service.spec.ts --verbose --coverage

describe('IncidentService', () => {
  let service: IncidentService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let repository: Repository<Incident>;

  const mockIncidentDto = {
    informant: 'SV001',
    location: 'LOC_2',
    handler: 'SV010',
    update_by: 'SV010',
    category: 'CAT015',
    update_on: '2025-04-09',
    status: IncidentStatus.OPEN,
    priority: IncidentPriority.CRITICAL,
    description: 'Laptop not turning on.',
    notify_informant: true,
    urgent_notification_to: 'SV001',
    Attachment: '',
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

  const mockRepository = {
    query: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentService,
        {
          provide: getRepositoryToken(Incident),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<IncidentService>(IncidentService);
    repository = module.get<Repository<Incident>>(getRepositoryToken(Incident));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('incident create method (service)', () => {
    it('should create an incident successfully', async () => {
      //pretend the sequence returns a value
      mockRepository.query.mockResolvedValue([{ value: '1' }]);
      mockRepository.create.mockReturnValue(mockIncident);
      mockRepository.save.mockResolvedValue(mockIncident);
      // Call the create method
      const result = await service.create(mockIncidentDto as IncidentDto);

      expect(mockRepository.query).toHaveBeenCalledWith(
        "SELECT nextval('incident_number_seq') as value",
      );
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...mockIncidentDto,
        incident_number: 'IN1',
      });
      expect(mockRepository.save).toHaveBeenCalledWith(mockIncident);
      expect(result).toEqual(mockIncident);
    });

    it('should throw BadRequestException if required field "informant" is missing', async () => {
      const invalidDto = { ...mockIncidentDto, informant: undefined };
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow('Missing required field: informant');
    });

    it('should throw BadRequestException if required field "location" is missing', async () => {
      const invalidDto = { ...mockIncidentDto, location: undefined };
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow('Missing required field: location');
    });

    it('should throw BadRequestException if required field "handler" is missing', async () => {
      const invalidDto = { ...mockIncidentDto, handler: undefined };
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow('Missing required field: handler');
    });

    it('should throw BadRequestException if required field "category" is missing', async () => {
      const invalidDto = { ...mockIncidentDto, category: undefined };
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow('Missing required field: category');
    });

    it('should throw BadRequestException if required field "status" is missing', async () => {
      const invalidDto = { ...mockIncidentDto, status: undefined };
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow('Missing required field: status');
    });

    it('should throw BadRequestException if required field "priority" is missing', async () => {
      const invalidDto = { ...mockIncidentDto, priority: undefined };
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(invalidDto as unknown as IncidentDto),
      ).rejects.toThrow('Missing required field: priority');
    });

    it('should throw BadRequestException if sequence fails', async () => {
      mockRepository.query.mockResolvedValue([]);
      await expect(
        service.create(mockIncidentDto as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.create(mockIncidentDto as IncidentDto),
      ).rejects.toThrow('Failed to generate incident number');
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      mockRepository.query.mockResolvedValue([{ value: '1' }]);
      mockRepository.save.mockRejectedValue(new Error('DB error'));
      await expect(
        service.create(mockIncidentDto as IncidentDto),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.create(mockIncidentDto as IncidentDto),
      ).rejects.toThrow('Failed to create incident: DB error');
    });
  });

  describe('getAll', () => {
    it('should return all incidents', async () => {
      const incidents = [mockIncident, mockIncident2];
      mockRepository.find.mockResolvedValue(incidents);

      const result = await service.getAll();

      expect(mockRepository.find).toHaveBeenCalled();
      expect(result).toEqual(incidents);
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      mockRepository.find.mockRejectedValue(new Error('Database error'));
      await expect(service.getAll()).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getAll()).rejects.toThrow(
        'Failed to retrieve all incidents: Database error',
      );
    });
  });

  describe('getAssignedToMe', () => {
    it('should return incidents by handlerId', async () => {
      const incidents = [mockIncident];
      const dto = { handler: 'SV010' } as IncidentDto;
      mockRepository.find.mockResolvedValue(incidents);

      const result = await service.getAssignedToMe(dto);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { handler: 'SV010' },
      });
      expect(result).toEqual(incidents);
    });

    it('should throw BadRequestException if handlerId is missing', async () => {
      const dto = { handler: undefined } as unknown as IncidentDto;
      await expect(service.getAssignedToMe(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getAssignedToMe(dto)).rejects.toThrow(
        'handler is required',
      );
    });

    it('should throw InternalServerErrorException on DB failure', async () => {
      const dto = { handler: 'SV010' } as IncidentDto;
      mockRepository.find.mockRejectedValue(new Error('DB error'));

      await expect(service.getAssignedToMe(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getAssignedToMe(dto)).rejects.toThrow(
        'Failed to retrieve incidents: DB error',
      );
    });
  });

  describe('getAssignedByMe', () => {
    it('should return incidents by informantId', async () => {
      const incidents = [mockIncident];
      const dto = { informant: 'SV001' } as IncidentDto;
      mockRepository.find.mockResolvedValue(incidents);

      const result = await service.getAssignedByMe(dto);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { informant: 'SV001' },
      });
      expect(result).toEqual(incidents);
    });

    it('should throw BadRequestException if informantId is missing', async () => {
      const dto = { informant: undefined } as unknown as IncidentDto;
      await expect(service.getAssignedByMe(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getAssignedByMe(dto)).rejects.toThrow(
        'informant is required',
      );
    });

    it('should throw InternalServerErrorException on DB failure', async () => {
      const dto = { informant: 'SV001' } as IncidentDto;
      mockRepository.find.mockRejectedValue(new Error('DB error'));

      await expect(service.getAssignedByMe(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getAssignedByMe(dto)).rejects.toThrow(
        'Failed to retrieve incidents assigned by informant: DB error',
      );
    });
  });

  describe('getByCategory', () => {
    it('should return incidents by category', async () => {
      const incidents = [mockIncident];
      const dto = { category: 'CAT015' } as unknown as IncidentDto;
      mockRepository.find.mockResolvedValue(incidents);

      const result = await service.getByCategory(dto);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { category: 'CAT015' },
      });
      expect(result).toEqual(incidents);
    });

    it('should throw BadRequestException if categoryId is missing', async () => {
      const dto = { category: undefined } as unknown as IncidentDto;
      await expect(service.getByCategory(dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getByCategory(dto)).rejects.toThrow(
        'category is required',
      );
    });

    it('should throw InternalServerErrorException on DB failure', async () => {
      const dto = { category: 'CAT015' } as unknown as IncidentDto;
      mockRepository.find.mockRejectedValue(new Error('DB error'));

      await expect(service.getByCategory(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getByCategory(dto)).rejects.toThrow(
        'Failed to retrieve incidents by category: DB error',
      );
    });
  });

  describe('update', () => {
    it('should update an incident successfully', async () => {
      const updateDto = {
        status: IncidentStatus.IN_PROGRESS,
      } as unknown as IncidentDto;
      const updatedIncident = {
        ...mockIncident,
        status: IncidentStatus.IN_PROGRESS,
      };
      mockRepository.findOne.mockResolvedValue(mockIncident);
      mockRepository.save.mockResolvedValue(updatedIncident);

      const result = await service.update('IN1', updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { incident_number: 'IN1' },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockIncident,
        status: 'In Progress',
      });
      expect(result).toEqual(updatedIncident);
    });

    it('should throw NotFoundException if incident not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(
        service.update('IN999', {
          status: IncidentStatus.IN_PROGRESS,
        } as unknown as IncidentDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.update('IN999', {
          status: IncidentStatus.IN_PROGRESS,
        } as unknown as IncidentDto),
      ).rejects.toThrow('Incident with incident_number IN999 not found');
    });

    it('should throw BadRequestException if no fields provided', async () => {
      mockRepository.findOne.mockResolvedValue(mockIncident);
      await expect(
        service.update('IN1', {} as unknown as IncidentDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.update('IN1', {} as unknown as IncidentDto),
      ).rejects.toThrow('At least one field is required to update');
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      mockRepository.findOne.mockResolvedValue(mockIncident);
      mockRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(
        service.update('IN1', {
          status: IncidentStatus.IN_PROGRESS,
        } as unknown as IncidentDto),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        service.update('IN1', {
          status: IncidentStatus.IN_PROGRESS,
        } as unknown as IncidentDto),
      ).rejects.toThrow('Failed to update incident: DB error');
    });
  });

  describe('getIncidentByNumber', () => {
    it('should return an incident by incident_number', async () => {
      mockRepository.findOne.mockResolvedValue(mockIncident);

      const result = await service.getIncidentByNumber('IN1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { incident_number: 'IN1' },
      });
      expect(result).toEqual(mockIncident);
    });

    it('should throw NotFoundException if incident not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      await expect(service.getIncidentByNumber('IN999')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getIncidentByNumber('IN999')).rejects.toThrow(
        'Incident with incident_number IN999 not found',
      );
    });

    it('should throw InternalServerErrorException on DB error', async () => {
      mockRepository.findOne.mockRejectedValue(new Error('DB error'));
      await expect(service.getIncidentByNumber('IN1')).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.getIncidentByNumber('IN1')).rejects.toThrow(
        'Failed to retrieve incident: DB error',
      );
    });
  });
});
