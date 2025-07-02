import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LocationService } from '../location.service'; 
import { Location } from '../entities/location.entity'; 
import { Repository } from 'typeorm';
import { CreateLocationDto, UpdateLocationDto } from '../dto/create-location.dto';
import { Region } from '../enums/region.enum'; 
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('LocationService', () => {
  let service: LocationService;
  let repo: Repository<Location>;

  const mockRepo = {
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: getRepositoryToken(Location),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    repo = module.get<Repository<Location>>(getRepositoryToken(Location));
  });

  afterEach(() => jest.clearAllMocks());

  it('should create location successfully', async () => {
    const dto: CreateLocationDto = {
      locationId: 'LOC001',
      locationName: 'Main Branch',
      region: Region.METRO,
      province: 'Western',
    };

    mockRepo.findOneBy.mockResolvedValue(null);
    mockRepo.create.mockReturnValue(dto);
    mockRepo.save.mockResolvedValue({ ...dto, id: 1 });

    const result = await service.create(dto);
    expect(result).toEqual({ ...dto, id: 1 });
    expect(mockRepo.create).toBeCalledWith(dto);
  });

  it('should throw if locationId is not unique', async () => {
    mockRepo.findOneBy.mockResolvedValue({ locationId: 'LOC001' });
    await expect(
      service.create({
        locationId: 'LOC001',
        locationName: 'Branch A',
        region: Region.R1,
        province: 'North',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should return all locations', async () => {
    mockRepo.find.mockResolvedValue([{ id: 1, locationName: 'Test' }]);
    const result = await service.findAll();
    expect(result).toEqual([{ id: 1, locationName: 'Test' }]);
  });

  it('should find one location', async () => {
    mockRepo.findOneBy.mockResolvedValue({ id: 1, locationName: 'Test' });
    const result = await service.findOne(1);
    expect(result).toEqual({ id: 1, locationName: 'Test' });
  });

  it('should throw if location not found', async () => {
    mockRepo.findOneBy.mockResolvedValue(null);
    await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
  });
});