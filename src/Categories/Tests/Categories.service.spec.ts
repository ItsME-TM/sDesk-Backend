import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { CategoryService } from '../Categories.service'; 
import { MainCategory, SubCategory, CategoryItem } from '../Entities/Categories.entity';
import { MainCategoryDto } from '../dto/main-category.dto'; 

describe('CategoryService', () => {
  let service: CategoryService;
  let mainCategoryRepository: Repository<MainCategory>;
  let subCategoryRepository: Repository<SubCategory>;
  let categoryItemRepository: Repository<CategoryItem>;

  // Mock repositories
  const mockMainCategoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };

  const mockSubCategoryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  const mockCategoryItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(MainCategory),
          useValue: mockMainCategoryRepository,
        },
        {
          provide: getRepositoryToken(SubCategory),
          useValue: mockSubCategoryRepository,
        },
        {
          provide: getRepositoryToken(CategoryItem),
          useValue: mockCategoryItemRepository,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    mainCategoryRepository = module.get<Repository<MainCategory>>(getRepositoryToken(MainCategory));
    subCategoryRepository = module.get<Repository<SubCategory>>(getRepositoryToken(SubCategory));
    categoryItemRepository = module.get<Repository<CategoryItem>>(getRepositoryToken(CategoryItem));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createMainCategory', () => {
    it('should create a main category successfully', async () => {
      // Arrange
      const createMainCategoryDto: MainCategoryDto = {
        name: 'Electronics',
      };

      const expectedMainCategory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Electronics',
        createdAt: new Date(),
        updatedAt: new Date(),
        subCategories: [],
      };

      mockMainCategoryRepository.create.mockReturnValue(expectedMainCategory);
      mockMainCategoryRepository.save.mockResolvedValue(expectedMainCategory);

      // Act
      const result = await service.createMainCategory(createMainCategoryDto);

      // Assert
      expect(mockMainCategoryRepository.create).toHaveBeenCalledWith(createMainCategoryDto);
      expect(mockMainCategoryRepository.save).toHaveBeenCalledWith(expectedMainCategory);
      expect(result).toEqual(expectedMainCategory);
    });
  });

  describe('findAllMainCategories', () => {
    it('should return all main categories with sub categories', async () => {
      // Arrange
      const expectedCategories = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Electronics',
          subCategories: [],
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Clothing',
          subCategories: [],
        },
      ];

      mockMainCategoryRepository.find.mockResolvedValue(expectedCategories);

      // Act
      const result = await service.findAllMainCategories();

      // Assert
      expect(mockMainCategoryRepository.find).toHaveBeenCalledWith({
        relations: ['subCategories'],
      });
      expect(result).toEqual(expectedCategories);
    });
  });

  describe('findMainCategoryById', () => {
    it('should return a main category when found', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedCategory = {
        id: categoryId,
        name: 'Electronics',
        subCategories: [],
      };

      mockMainCategoryRepository.findOne.mockResolvedValue(expectedCategory);

      // Act
      const result = await service.findMainCategoryById(categoryId);

      // Assert
      expect(mockMainCategoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: categoryId },
        relations: ['subCategories'],
      });
      expect(result).toEqual(expectedCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      // Arrange
      const categoryId = 'non-existent-id';
      mockMainCategoryRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findMainCategoryById(categoryId)).rejects.toThrow(
        new NotFoundException(`Main category with ID ${categoryId} not found`),
      );
    });
  });

  describe('updateMainCategory', () => {
    it('should update a main category successfully', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const updateMainCategoryDto: MainCategoryDto = {
        name: 'Updated Electronics',
      };

      const existingCategory = {
        id: categoryId,
        name: 'Electronics',
        subCategories: [],
      };

      const updatedCategory = {
        ...existingCategory,
        name: 'Updated Electronics',
      };

      mockMainCategoryRepository.findOne.mockResolvedValue(existingCategory);
      mockMainCategoryRepository.merge.mockImplementation((target, source) => {
        Object.assign(target, source);
        return target;
      });
      mockMainCategoryRepository.save.mockResolvedValue(updatedCategory);

      // Act
      const result = await service.updateMainCategory(categoryId, updateMainCategoryDto);

      // Assert
      expect(mockMainCategoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: categoryId },
        relations: ['subCategories'],
      });
      expect(mockMainCategoryRepository.merge).toHaveBeenCalledWith(existingCategory, updateMainCategoryDto);
      expect(mockMainCategoryRepository.save).toHaveBeenCalledWith(existingCategory);
      expect(result).toEqual(updatedCategory);
    });

    it('should throw NotFoundException when updating non-existent category', async () => {
      // Arrange
      const categoryId = 'non-existent-id';
      const updateMainCategoryDto: MainCategoryDto = {
        name: 'Updated Electronics',
      };

      mockMainCategoryRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateMainCategory(categoryId, updateMainCategoryDto)).rejects.toThrow(
        new NotFoundException(`Main category with ID ${categoryId} not found`),
      );
    });
  });

  describe('deleteMainCategory', () => {
    it('should delete a main category successfully', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      mockMainCategoryRepository.delete.mockResolvedValue({ affected: 1 });

      // Act
      await service.deleteMainCategory(categoryId);

      // Assert
      expect(mockMainCategoryRepository.delete).toHaveBeenCalledWith(categoryId);
    });

    it('should throw NotFoundException when deleting non-existent category', async () => {
      // Arrange
      const categoryId = 'non-existent-id';
      mockMainCategoryRepository.delete.mockResolvedValue({ affected: 0 });

      // Act & Assert
      await expect(service.deleteMainCategory(categoryId)).rejects.toThrow(
        new NotFoundException(`Main category with ID ${categoryId} not found`),
      );
    });
  });
});