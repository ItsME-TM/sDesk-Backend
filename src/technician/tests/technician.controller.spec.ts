import { Test, TestingModule } from '@nestjs/testing';
import { TechnicianController } from '../technician.controller';
import { TechnicianService } from '../technician.service';
import { CreateTechnicianDto } from '../dto/create-technician.dto';
import { Technician } from '../entities/technician.entity';

describe('TechnicianController', () => {
  let controller: TechnicianController;
  let service: TechnicianService;

  const mockTechnician: Technician = {
    id: 1,
    serviceNum: 'T123',
    name: 'John Doe',
    team: 'Team A',
    cat1: 'C1',
    cat2: 'C2',
    cat3: 'C3',
    cat4: 'C4',
    rr: 10,
    active: true,
    tier:1,
    level: 'Level 1',
    teamLevel: 'Team L1',
    designation: 'Technician',
    email: 'john@example.com',
    contactNumber: '1234567890',
    teamLeader: true,
    assignAfterSignOff: false,
    permanentMember: true,
    subrootUser: false,
  };


  const completeDto: CreateTechnicianDto = {
    serviceNum: 'T123',
    name: 'John Doe',
    team: 'Team A',
    cat1: 'C1',
    cat2: 'C2',
    cat3: 'C3',
    cat4: 'C4',
    rr: 10,
    active: true,
    tier:1,
    level: 'Level 1',
    teamLevel: 'Team L1',
    designation: 'Technician',
    email: 'john@example.com',
    contactNumber: '1234567890',
    teamLeader: true,
    assignAfterSignOff: false,
    permanentMember: true,
    subrootUser: false,
  };

  const mockService = {
    createTechnician: jest.fn().mockResolvedValue(mockTechnician),
    findAllTechncians: jest.fn().mockResolvedValue([mockTechnician]),
    findOneTechnician: jest.fn().mockResolvedValue(mockTechnician),
    updateTechnician: jest.fn().mockResolvedValue(mockTechnician),
    deleteTechnician: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechnicianController],
      providers: [{ provide: TechnicianService, useValue: mockService }],
    }).compile();

    controller = module.get<TechnicianController>(TechnicianController);
    service = module.get<TechnicianService>(TechnicianService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create technician', async () => {
    expect(await controller.add(completeDto)).toEqual(mockTechnician);
    expect(mockService.createTechnician).toHaveBeenCalledWith(completeDto);
  });

  it('should return all technicians', async () => {
    expect(await controller.findAllTechnicians()).toEqual([mockTechnician]);
  });

  it('should return one technician', async () => {
    expect(await controller.findOneTechnician('T123')).toEqual(mockTechnician);
  });

  it('should update technician', async () => {
    const updateDto = { ...completeDto, name: 'New Name' };
    expect(await controller.updateTechnician('T123', updateDto)).toEqual(mockTechnician);
  });

  it('should delete technician and return message', async () => {
    expect(await controller.deleteTechnician('T123')).toEqual({
      message: 'Technician deleted successfully.',
    });
    expect(mockService.deleteTechnician).toHaveBeenCalledWith('T123');
  });
});
