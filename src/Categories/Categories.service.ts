import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MainCategory,
  SubCategory,
  CategoryItem,
} from './Entities/Categories.entity';
import { MainCategoryDto } from './dto/main-category.dto';
import { SubCategoryDto } from './dto/sub-category.dto';
import { CategoryItemDto } from './dto/category-item.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(MainCategory)
    private mainCategoryRepository: Repository<MainCategory>,

    @InjectRepository(SubCategory)
    private subCategoryRepository: Repository<SubCategory>,

    @InjectRepository(CategoryItem)
    private categoryItemRepository: Repository<CategoryItem>,
  ) {}

  private async generateMainCategoryCode(): Promise<string> {
    const count = await this.mainCategoryRepository.count();
    return `MAIN${(count + 1).toString().padStart(3, '0')}`;
  }

  private async generateSubCategoryCode(): Promise<string> {
    const count = await this.subCategoryRepository.count();
    return `SUB${(count + 1).toString().padStart(3, '0')}`;
  }

  private async generateCategoryItemCode(): Promise<string> {
    const count = await this.categoryItemRepository.count();
    return `CAT${(count + 1).toString().padStart(3, '0')}`;
  }

  async createMainCategory(
    createMainCategoryDto: MainCategoryDto,
  ): Promise<MainCategory> {
    // Check for duplicate name (case-insensitive, trimmed)
    const nameToCheck = createMainCategoryDto.name.trim().toLowerCase();
    const existing = await this.mainCategoryRepository
      .createQueryBuilder('mainCategory')
      .where('LOWER(TRIM(mainCategory.name)) = :name', { name: nameToCheck })
      .getOne();
    if (existing) {
      throw new Error(`Main category with name '${createMainCategoryDto.name}' already exists`);
    }
    const category_code = await this.generateMainCategoryCode();
    const mainCategory = this.mainCategoryRepository.create({
      ...createMainCategoryDto,
      category_code,
    });
    return this.mainCategoryRepository.save(mainCategory);
  }

  async findAllMainCategories(): Promise<MainCategory[]> {
    return this.mainCategoryRepository.find({
      relations: ['subCategories'],
    });
  }

  async findMainCategoryById(id: string): Promise<MainCategory> {
    const mainCategory = await this.mainCategoryRepository.findOne({
      where: { id },
      relations: ['subCategories'],
    });

    if (!mainCategory) {
      throw new NotFoundException(`Main category with ID ${id} not found`);
    }

    return mainCategory;
  }

  async updateMainCategory(
    id: string,
    updateMainCategoryDto: MainCategoryDto,
  ): Promise<MainCategory> {
    const mainCategory = await this.findMainCategoryById(id);

    this.mainCategoryRepository.merge(mainCategory, updateMainCategoryDto);
    return this.mainCategoryRepository.save(mainCategory);
  }

  async deleteMainCategory(id: string): Promise<void> {
    const result = await this.mainCategoryRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Main category with ID ${id} not found`);
    }
  }

  async createSubCategory(
    createSubCategoryDto: SubCategoryDto,
  ): Promise<SubCategory> {
    const { mainCategoryId, name, ...subCategoryData } = createSubCategoryDto;

    const mainCategory = await this.mainCategoryRepository.findOne({
      where: { id: mainCategoryId },
    });

    if (!mainCategory) {
      throw new NotFoundException(
        `Main category with ID ${mainCategoryId} not found`,
      );
    }

    // Check for duplicate subcategory name under the same main category (case-insensitive, trimmed)
    const nameToCheck = name.trim().toLowerCase();
    const existing = await this.subCategoryRepository
      .createQueryBuilder('subCategory')
      .leftJoin('subCategory.mainCategory', 'mainCategory')
      .where('LOWER(TRIM(subCategory.name)) = :name', { name: nameToCheck })
      .andWhere('mainCategory.id = :mainCategoryId', { mainCategoryId })
      .getOne();
    if (existing) {
      throw new Error(`Sub category with name '${name}' already exists under this main category`);
    }

    const category_code = await this.generateSubCategoryCode();

    const subCategory = this.subCategoryRepository.create({
      ...subCategoryData,
      name,
      category_code,
      mainCategory,
    });

    return this.subCategoryRepository.save(subCategory);
  }

  async findAllSubCategories(): Promise<SubCategory[]> {
    return this.subCategoryRepository.find({
      relations: ['mainCategory', 'categoryItems'],
    });
  }

  async findSubCategoryById(id: string): Promise<SubCategory> {
    const subCategory = await this.subCategoryRepository.findOne({
      where: { id },
      relations: ['mainCategory', 'categoryItems'],
    });

    if (!subCategory) {
      throw new NotFoundException(`Sub category with ID ${id} not found`);
    }

    return subCategory;
  }

  async updateSubCategory(
    id: string,
    updateSubCategoryDto: SubCategoryDto,
  ): Promise<SubCategory> {
    const subCategory = await this.findSubCategoryById(id);

    if (updateSubCategoryDto.mainCategoryId) {
      const mainCategory = await this.mainCategoryRepository.findOne({
        where: { id: updateSubCategoryDto.mainCategoryId },
      });

      if (!mainCategory) {
        throw new NotFoundException(
          `Main category with ID ${updateSubCategoryDto.mainCategoryId} not found`,
        );
      }

      subCategory.mainCategory = mainCategory;
    }

    if (updateSubCategoryDto.name) {
      subCategory.name = updateSubCategoryDto.name;
    }

    return this.subCategoryRepository.save(subCategory);
  }

  async deleteSubCategory(id: string): Promise<void> {
    const result = await this.subCategoryRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Sub category with ID ${id} not found`);
    }
  }

  async createCategoryItem(
    createCategoryItemDto: CategoryItemDto,
  ): Promise<CategoryItem> {
    const { subCategoryId, name, ...categoryItemData } = createCategoryItemDto;

    // Check if sub category exists
    const subCategory = await this.subCategoryRepository.findOne({
      where: { id: subCategoryId },
    });

    if (!subCategory) {
      throw new NotFoundException(
        `Sub category with ID ${subCategoryId} not found`,
      );
    }

    // Check for duplicate category item name under the same sub category (case-insensitive, trimmed)
    const nameToCheck = name.trim().toLowerCase();
    const existing = await this.categoryItemRepository
      .createQueryBuilder('categoryItem')
      .where('LOWER(TRIM(categoryItem.name)) = :name', { name: nameToCheck })
      .andWhere('categoryItem.subCategory = :subCategoryId', { subCategoryId })
      .getOne();
    if (existing) {
      throw new Error(`Category item with name '${name}' already exists under this sub category`);
    }

    const category_code = await this.generateCategoryItemCode();

    const categoryItem = this.categoryItemRepository.create({
      ...categoryItemData,
      name,
      category_code,
      subCategory,
    });

    return this.categoryItemRepository.save(categoryItem);
  }

  async findAllCategoryItems(): Promise<CategoryItem[]> {
    return this.categoryItemRepository.find({
      relations: ['subCategory', 'subCategory.mainCategory'],
    });
  }

  async findCategoryItemById(id: string): Promise<CategoryItem> {
    const categoryItem = await this.categoryItemRepository.findOne({
      where: { id },
      relations: ['subCategory'],
    });

    if (!categoryItem) {
      throw new NotFoundException(`Category item with ID ${id} not found`);
    }

    return categoryItem;
  }

  async updateCategoryItem(
    id: string,
    updateCategoryItemDto: CategoryItemDto,
  ): Promise<CategoryItem> {
    const categoryItem = await this.findCategoryItemById(id);

    if (updateCategoryItemDto.subCategoryId) {
      const subCategory = await this.subCategoryRepository.findOne({
        where: { id: updateCategoryItemDto.subCategoryId },
      });

      if (!subCategory) {
        throw new NotFoundException(
          `Sub category with ID ${updateCategoryItemDto.subCategoryId} not found`,
        );
      }

      categoryItem.subCategory = subCategory;
    }

    if (updateCategoryItemDto.name) {
      categoryItem.name = updateCategoryItemDto.name;
    }

    return this.categoryItemRepository.save(categoryItem);
  }

  async deleteCategoryItem(id: string): Promise<void> {
    const result = await this.categoryItemRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Category item with ID ${id} not found`);
    }
  }

  async getNextMainCategoryCode(): Promise<{ category_code: string }> {
    const code = await this.generateMainCategoryCode();
    return { category_code: code };
  }

  async getNextSubCategoryCode(): Promise<{ category_code: string }> {
    const code = await this.generateSubCategoryCode();
    return { category_code: code };
  }

  async getNextCategoryItemCode(): Promise<{ category_code: string }> {
    const code = await this.generateCategoryItemCode();
    return { category_code: code };
  }

  async findSubCategoriesByMainCategoryId(mainCategoryId: string): Promise<SubCategory[]> {
    const mainCategory = await this.mainCategoryRepository.findOne({ where: { id: mainCategoryId } });
    if (!mainCategory) {
      throw new NotFoundException(`Main category with ID ${mainCategoryId} not found`);
    }
    return this.subCategoryRepository.find({
      where: { mainCategory: { id: mainCategoryId } },
      relations: ['mainCategory', 'categoryItems'],
    });
  }
}
