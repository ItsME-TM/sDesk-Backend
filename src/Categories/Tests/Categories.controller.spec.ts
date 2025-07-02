import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from '../Categories.controller';
import { CategoryService } from '../Categories.service';
import { MainCategoryDto } from '../dto/main-category.dto';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;

  // Mock service
  const mockCategoryService = {
    createMainCategory: jest.fn(),
    findAllMainCategories: jest.fn(),
    findMainCategoryById: jest.fn(),
    updateMainCategory: jest.fn(),
    deleteMainCategory: jest.fn(),
    createSubCategory: jest.fn(),
    findAllSubCategories: jest.fn(),
    findSubCategoryById: jest.fn(),
    updateSubCategory: jest.fn(),
    deleteSubCategory: jest.fn(),
    createCategoryItem: jest.fn(),
    findAllCategoryItems: jest.fn(),
    findCategoryItemById: jest.fn(),
    updateCategoryItem: jest.fn(),
    deleteCategoryItem: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createMainCategory', () => {
    it('should create a main category', async () => {
      // Arrange
      const createMainCategoryDto: MainCategoryDto = {
        name: 'Electronics',
      };

      const expectedResult = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Electronics',
        createdAt: new Date(),
        updatedAt: new Date(),
        subCategories: [],
      };

      mockCategoryService.createMainCategory.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.createMainCategory(createMainCategoryDto);

      // Assert
      expect(service.createMainCategory).toHaveBeenCalledWith(createMainCategoryDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAllMainCategories', () => {
    it('should return all main categories', async () => {
      // Arrange
      const expectedResult = [
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

      mockCategoryService.findAllMainCategories.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findAllMainCategories();

      // Assert
      expect(service.findAllMainCategories).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findMainCategoryById', () => {
    it('should return a main category by id', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const expectedResult = {
        id: categoryId,
        name: 'Electronics',
        subCategories: [],
      };

      mockCategoryService.findMainCategoryById.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.findMainCategoryById(categoryId);

      // Assert
      expect(service.findMainCategoryById).toHaveBeenCalledWith(categoryId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('updateMainCategory', () => {
    it('should update a main category', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      const updateMainCategoryDto: MainCategoryDto = {
        name: 'Updated Electronics',
      };

      const expectedResult = {
        id: categoryId,
        name: 'Updated Electronics',
        subCategories: [],
      };

      mockCategoryService.updateMainCategory.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.updateMainCategory(categoryId, updateMainCategoryDto);

      // Assert
      expect(service.updateMainCategory).toHaveBeenCalledWith(categoryId, updateMainCategoryDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteMainCategory', () => {
    it('should delete a main category', async () => {
      // Arrange
      const categoryId = '123e4567-e89b-12d3-a456-426614174000';
      mockCategoryService.deleteMainCategory.mockResolvedValue(undefined);

      // Act
      await controller.deleteMainCategory(categoryId);

      // Assert
      expect(service.deleteMainCategory).toHaveBeenCalledWith(categoryId);
    });
  });
});