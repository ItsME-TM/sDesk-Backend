import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './Categories.service';
import { MainCategoryDto } from './dto/main-category.dto';
import { SubCategoryDto } from './dto/sub-category.dto';
import { CategoryItemDto } from './dto/category-item.dto';
import {
  MainCategory,
  SubCategory,
  CategoryItem,
} from './Entities/Categories.entity';
import { JwtAuthGuard } from '../middlewares/jwt-auth.guard';
import { RolesGuard } from '../middlewares/roles.guard';
import { Roles } from '../middlewares/roles.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // Main Category Endpoints
  @Post('main')
  @Roles('superAdmin')
  async createMainCategory(
    @Body() dto: MainCategoryDto,
  ): Promise<MainCategory> {
    try {
      return await this.categoryService.createMainCategory(dto);
    } catch (error) {
      // If duplicate name error, send a specific error code
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('already exists')) {
        throw new BadRequestException({
          code: 'DUPLICATE_NAME',
          message,
        });
      }
      throw new BadRequestException(message);
    }
  }

  @Get('main')
  async findAllMainCategories(): Promise<MainCategory[]> {
    try {
      return await this.categoryService.findAllMainCategories();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  @Put('main/:id')
  @Roles('superAdmin')
  async updateMainCategory(
    @Param('id') id: string,
    @Body() dto: MainCategoryDto,
  ): Promise<MainCategory> {
    try {
      return await this.categoryService.updateMainCategory(id, dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }

  @Delete('main/:id')
  @Roles('superAdmin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMainCategory(@Param('id') id: string): Promise<void> {
    try {
      await this.categoryService.deleteMainCategory(id);
    } catch (error) {
      throw new NotFoundException(`Main category with ID ${id} not found`);
    }
  }

  // Sub Category Endpoints
  @Post('sub')
  @Roles('superAdmin')
  async createSubCategory(@Body() dto: SubCategoryDto): Promise<SubCategory> {
    try {
      return await this.categoryService.createSubCategory(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('already exists')) {
        throw new BadRequestException({
          code: 'DUPLICATE_NAME',
          message,
        });
      }
      throw new BadRequestException(message);
    }
  }

  @Get('sub')
  async findAllSubCategories(): Promise<SubCategory[]> {
    try {
      return await this.categoryService.findAllSubCategories();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  @Put('sub/:id')
  @Roles('superAdmin')
  async updateSubCategory(
    @Param('id') id: string,
    @Body() dto: SubCategoryDto,
  ): Promise<SubCategory> {
    try {
      return await this.categoryService.updateSubCategory(id, dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }

  @Delete('sub/:id')
  @Roles('superAdmin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSubCategory(@Param('id') id: string): Promise<void> {
    try {
      await this.categoryService.deleteSubCategory(id);
    } catch (error) {
      throw new NotFoundException(`Sub category with ID ${id} not found`);
    }
  }

  @Get('sub/by-main/:mainCategoryId')
  async findSubCategoriesByMainCategoryId(
    @Param('mainCategoryId') mainCategoryId: string,
  ): Promise<SubCategory[]> {
    try {
      return await this.categoryService.findSubCategoriesByMainCategoryId(
        mainCategoryId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Category Item Endpoints
  @Post('item')
  @Roles('superAdmin')
  async createCategoryItem(
    @Body() dto: CategoryItemDto,
  ): Promise<CategoryItem> {
    try {
      return await this.categoryService.createCategoryItem(dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('already exists')) {
        throw new BadRequestException({
          code: 'DUPLICATE_NAME',
          message,
        });
      }
      throw new BadRequestException(message);
    }
  }

  @Get('item')
  async findAllCategoryItems(): Promise<CategoryItem[]> {
    try {
      return await this.categoryService.findAllCategoryItems();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  @Put('item/:id')
  @Roles('superAdmin')
  async updateCategoryItem(
    @Param('id') id: string,
    @Body() dto: CategoryItemDto,
  ): Promise<CategoryItem> {
    try {
      return await this.categoryService.updateCategoryItem(id, dto);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(message);
    }
  }

  @Delete('item/:id')
  @Roles('admin', 'superAdmin')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCategoryItem(@Param('id') id: string): Promise<void> {
    try {
      await this.categoryService.deleteCategoryItem(id);
    } catch (error) {
      throw new NotFoundException(`Category item with ID ${id} not found`);
    }
  }
}
