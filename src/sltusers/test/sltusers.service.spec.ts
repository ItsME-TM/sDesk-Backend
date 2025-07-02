import { Test, TestingModule } from '@nestjs/testing';
import { SLTUsersService } from '../sltusers.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SLTUser } from '../entities/sltuser.entity';
import { Repository } from 'typeorm';

describe('SLTUsersService', () => {
  let service: SLTUsersService;
  let repo: Repository<SLTUser>;

  const mockUser: SLTUser = {
    id: '1',
    azureId: 'azure-1',
    serviceNum: 'srv-1',
    display_name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const repoMock = {
    find: jest.fn().mockResolvedValue([mockUser]),
    findOne: jest.fn().mockResolvedValue(mockUser),
    save: jest.fn().mockResolvedValue(mockUser),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
    create: jest.fn().mockReturnValue(mockUser),
    createQueryBuilder: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(mockUser),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SLTUsersService,
        { provide: getRepositoryToken(SLTUser), useValue: repoMock },
      ],
    }).compile();
    service = module.get<SLTUsersService>(SLTUsersService);
    repo = module.get<Repository<SLTUser>>(getRepositoryToken(SLTUser));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find all users', async () => {
    expect(await service.findAll()).toEqual([mockUser]);
    expect(repo.find).toHaveBeenCalled();
  });

  it('should find user by serviceNum', async () => {
    expect(await service.findByServiceNum('srv-1')).toEqual(mockUser);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { serviceNum: 'srv-1' } });
  });

  it('should create a user', async () => {
    expect(await service.createUser(mockUser)).toEqual(mockUser);
    expect(repo.create).toHaveBeenCalledWith(mockUser);
    expect(repo.save).toHaveBeenCalledWith(mockUser);
  });

  it('should update a user by serviceNum', async () => {
    expect(await service.updateUserByServiceNum('srv-1', { display_name: 'Updated' })).toEqual(mockUser);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { serviceNum: 'srv-1' } });
    expect(repo.save).toHaveBeenCalledWith(mockUser);
  });

  it('should delete a user by serviceNum', async () => {
    expect(await service.deleteUserByServiceNum('srv-1')).toEqual({ deleted: true });
    expect(repo.delete).toHaveBeenCalledWith({ serviceNum: 'srv-1' });
  });
});
