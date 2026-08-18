import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ResultData } from '../../../common/utils/result';
import { formatDateTime } from '../../../common/utils/index';
import { ArticleCategoryEntity } from './entities/article-category.entity';
import {
  CreateArticleCategoryDto,
  UpdateArticleCategoryDto,
  ListArticleCategoryDto,
} from './dto/index';

@Injectable()
export class ArticleCategoryService {
  constructor(
    @InjectRepository(ArticleCategoryEntity)
    private readonly categoryRepo: Repository<ArticleCategoryEntity>,
  ) {}

  /** 将实体格式化为前端需要的 snake_case 结构 */
  private formatItem(item: ArticleCategoryEntity) {
    return {
      id: item.id,
      name: item.name,
      sort: item.sort,
      status: item.status,
      remark: item.remark,
      create_time: formatDateTime(item.createTime),
      update_time: formatDateTime(item.updateTime),
    };
  }

  async create(dto: CreateArticleCategoryDto) {
    await this.categoryRepo.save(dto);
    return ResultData.ok();
  }

  async update(dto: UpdateArticleCategoryDto) {
    const { id, ...rest } = dto;
    await this.categoryRepo.update({ id }, rest);
    return ResultData.ok();
  }

  async remove(ids: number[]) {
    await this.categoryRepo.softDelete(ids);
    return ResultData.ok();
  }

  async updateStatus(id: number, status: number) {
    await this.categoryRepo.update({ id }, { status } as any);
    return ResultData.ok();
  }

  async findAll(query: ListArticleCategoryDto) {
    const entity = this.categoryRepo.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');

    if (query.name) {
      entity.andWhere('entity.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.status !== undefined && query.status !== null) {
      entity.andWhere('entity.status = :status', { status: query.status });
    }

    entity.orderBy('entity.sort', 'ASC').addOrderBy('entity.id', 'DESC');

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);
    if (pageNum && pageSize) {
      entity.skip(pageSize * (pageNum - 1)).take(pageSize);
    }

    const [list, total] = await entity.getManyAndCount();
    return ResultData.ok({
      list: list.map((item) => this.formatItem(item)),
      total,
    });
  }

  async findOne(id: number) {
    const data = await this.categoryRepo.findOne({
      where: { id, deleteTime: IsNull() },
    });
    return ResultData.ok(data ? this.formatItem(data) : null);
  }

  /** 启用的分类列表（文章表单下拉选项用） */
  async findEnabled() {
    const list = await this.categoryRepo.find({
      where: { deleteTime: IsNull(), status: 1 },
      order: { sort: 'ASC', id: 'ASC' },
    });
    return ResultData.ok(list.map((item) => ({ id: item.id, name: item.name })));
  }
}
