import { Controller, Get, Post, Body, Put, Param, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ArticleCategoryService } from './article-category.service';
import {
  CreateArticleCategoryDto,
  UpdateArticleCategoryDto,
  ListArticleCategoryDto,
} from './dto/index';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('文章分类')
@Controller('api/article/category')
@ApiBearerAuth('Authorization')
export class ArticleCategoryController {
  constructor(private readonly categoryService: ArticleCategoryService) {}

  @ApiOperation({ summary: '分类列表' })
  @RequirePermission('core:articleCategory:index')
  @Get('list')
  findAll(@Query() query: ListArticleCategoryDto) {
    return this.categoryService.findAll(query);
  }

  @ApiOperation({ summary: '启用的分类（下拉选项）' })
  @RequirePermission('core:articleCategory:index')
  @Get('enabled')
  enabled() {
    return this.categoryService.findEnabled();
  }

  @ApiOperation({ summary: '分类详情' })
  @RequirePermission('core:articleCategory:index')
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.categoryService.findOne(+id);
  }

  @ApiOperation({ summary: '创建分类' })
  @ApiBody({ type: CreateArticleCategoryDto, required: true })
  @RequirePermission('core:articleCategory:add')
  @Post('create')
  create(@Body() dto: CreateArticleCategoryDto) {
    return this.categoryService.create(dto);
  }

  @ApiOperation({ summary: '更新分类' })
  @RequirePermission('core:articleCategory:edit')
  @Put('update/:id')
  update(@Param('id') id: string, @Body() dto: UpdateArticleCategoryDto) {
    dto.id = +id;
    return this.categoryService.update(dto);
  }

  @ApiOperation({ summary: '删除分类' })
  @RequirePermission('core:articleCategory:remove')
  @Delete('delete/:id')
  remove(@Param('id') ids: string) {
    const categoryIds = ids.split(',').map((id) => +id);
    return this.categoryService.remove(categoryIds);
  }

  @ApiOperation({ summary: '更新分类状态' })
  @RequirePermission('core:articleCategory:edit')
  @Put('status/:id')
  updateStatus(@Param('id') id: string, @Body() body: { status: number }) {
    return this.categoryService.updateStatus(+id, body.status);
  }
}
