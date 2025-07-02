import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from '../location.controller'; 
import { LocationService } from '../location.service'; 
import { CreateLocationDto } from '../dto/create-location.dto'; 
import { Region } from '../enums/region.enum';

describe('LocationController', () => {
  let controller: LocationController;
  let service: LocationService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [
        {
          provide: LocationService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<LocationController>(LocationController);
    service = module.get<LocationService>(LocationService);
  });

  it('should create a location', async () => {
    const dto: CreateLocationDto = {
      locationId: 'LOC002',
      locationName: 'Branch B',
      region: Region.R2,
      province: 'Eastern',
    };
    const result = { ...dto, id: 2 };
    mockService.create.mockResolvedValue(result);

    expect(await controller.create(dto)).toEqual(result);
    expect(mockService.create).toBeCalledWith(dto);
  });

  it('should return all locations', async () => {
    const result = [{ id: 1, locationName: 'Branch C' }];
    mockService.findAll.mockResolvedValue(result);
    expect(await controller.findAll()).toEqual(result);
  });

  it('should return one location by id', async () => {
    const result = { id: 3, locationName: 'Branch D' };
    mockService.findOne.mockResolvedValue(result);
    expect(await controller.findOne(3)).toEqual(result);
  });

  it('should update a location', async () => {
    const updateDto = { locationName: 'Updated Branch' };
    const result = { id: 4, ...updateDto };
    mockService.update.mockResolvedValue(result);
    expect(await controller.update(4, updateDto)).toEqual(result);
  });

  it('should delete a location', async () => {
    const result = { id: 5, locationName: 'To Be Deleted' };
    mockService.remove.mockResolvedValue(result);
    expect(await controller.remove(5)).toEqual(result);
  });
});
