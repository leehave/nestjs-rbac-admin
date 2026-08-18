import { Controller, Get, Post, Body, Put, Param, Query, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { PostService } from './post.service';
import { CreatePostDto, UpdatePostDto, ListPostDto } from './dto/index';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';

@ApiTags('岗位管理')
@Controller('api/system/post')
@ApiBearerAuth('Authorization')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @ApiOperation({ summary: '岗位列表' })
  @RequirePermission('core:post:index')
  @Get('list')
  findAll(@Query() query: ListPostDto) {
    return this.postService.findAll(query);
  }

  @ApiOperation({ summary: '启用的岗位' })
  @RequirePermission('core:post:index')
  @Get('enabled')
  enabled() {
    return this.postService.getAccessPostList();
  }

  @ApiOperation({ summary: '岗位详情' })
  @RequirePermission('core:post:read')
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.postService.findOne(+id);
  }

  @ApiOperation({ summary: '创建岗位' })
  @ApiBody({ type: CreatePostDto, required: true })
  @RequirePermission('core:post:save')
  @Post('create')
  create(@Body() createPostDto: CreatePostDto) {
    return this.postService.create(createPostDto);
  }

  @ApiOperation({ summary: '更新岗位' })
  @ApiBody({ type: UpdatePostDto, required: true })
  @RequirePermission('core:post:update')
  @Put('update/:id')
  update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    updatePostDto.id = +id;
    return this.postService.update(updatePostDto);
  }

  @ApiOperation({ summary: '删除岗位' })
  @RequirePermission('core:post:destroy')
  @Delete('delete/:id')
  remove(@Param('id') ids: string) {
    const postIds = ids.split(',').map((id) => +id);
    return this.postService.remove(postIds);
  }

  @ApiOperation({ summary: '更新岗位状态' })
  @RequirePermission('core:post:update')
  @Put('status/:id')
  updateStatus(@Param('id') id: string, @Body() body: { status: number }) {
    return this.postService.update({ id: +id, status: body.status } as UpdatePostDto);
  }

  @ApiOperation({ summary: '可访问岗位' })
  @RequirePermission('core:post:index')
  @Get('access-post')
  accessPost() {
    return this.postService.getAccessPostList();
  }
}
