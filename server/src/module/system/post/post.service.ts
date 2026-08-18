import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { ResultData } from '../../../common/utils/result';
import { ExportTable } from '../../../common/utils/export';
import { SysPostEntity } from './entities/post.entity';
import { applyTenantFilter, appendTenantWhere } from '../../../common/utils/tenant.util';
import { formatDateTime } from '../../../common/utils/index';
import type { Response } from 'express-serve-static-core';
import { CreatePostDto, UpdatePostDto, ListPostDto } from './dto/index';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(SysPostEntity)
    private readonly sysPostEntityRep: Repository<SysPostEntity>,
  ) {}
  /**
   * 格式化岗位数据
   * @description 将数据库实体对象转换为前端所需的格式，统一处理字段名和类型转换
   * @param item - 岗位数据库实体
   * @returns 格式化后的岗位对象（包含 id、name、code、sort、status、remark、create_time、update_time）
   */
  private formatPost(item: SysPostEntity) {
    return {
      id: Number(item.id),
      name: item.name,
      code: item.code,
      sort: item.sort,
      status: item.status,
      remark: item.remark,
      create_time: formatDateTime(item.createTime),
      update_time: formatDateTime(item.updateTime),
    };
  }

  async create(createPostDto: CreatePostDto) {
    await this.sysPostEntityRep.save(createPostDto);
    return ResultData.ok();
  }

  /**
   * 分页查询岗位列表
   * @description 根据查询条件（岗位名称、编码、状态）分页查询岗位数据，支持多条件模糊搜索，自动应用租户过滤
   * @param query - 查询参数，包含 name（岗位名称）、code（岗位编码）、status（状态）、
   *                pageNum/page（页码）、pageSize/limit（每页条数）等可选字段
   * @returns 返回分页结果，包含格式化后的岗位列表、总记录数、当前页码和每页大小
   */
  async findAll(query: ListPostDto & Record<string, any>) {
    const entity = this.sysPostEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');

    if (query.name) {
      entity.andWhere(`entity.name LIKE "%${query.name}%"`);
    }

    if (query.code) {
      entity.andWhere(`entity.code LIKE "%${query.code}%"`);
    }

    if (query.status !== undefined && query.status !== null) {
      entity.andWhere('entity.status = :status', { status: query.status });
    }

    applyTenantFilter(entity, 'entity');

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);
    entity.skip(pageSize * (pageNum - 1)).take(pageSize);

    const [list, total] = await entity.getManyAndCount();

    return ResultData.ok({
      list: list.map((item) => this.formatPost(item)),
      total,
      page: pageNum,
      current_page: pageNum,
      size: pageSize,
      per_page: pageSize,
    });
  }

  async findOne(postId: number) {
    const res = await this.sysPostEntityRep.findOne({
      where: appendTenantWhere({
        id: postId,
        deleteTime: IsNull(),
      }),
    });
    return ResultData.ok(res);
  }

  /**
   * 获取启用的岗位列表（权限选择用）
   * @description 查询状态为正常（status=1）的岗位，按排序字段升序排列，仅返回 id、name、code 三个字段，
   *              适用于前端权限分配时的岗位选择器
   * @returns 返回启用岗位的简约列表，每项包含 id、name、code
   */
  async getAccessPostList() {
    const entity = this.sysPostEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');
    entity.andWhere('entity.status = :status', { status: 1 });
    applyTenantFilter(entity, 'entity');
    entity.orderBy('entity.sort', 'ASC');
    entity.select(['entity.id', 'entity.name', 'entity.code']);
    const list = await entity.getMany();
    return ResultData.ok(list.map((item) => ({ id: Number(item.id), name: item.name, code: item.code })));
  }

  async update(updatePostDto: UpdatePostDto) {
    const res = await this.sysPostEntityRep.update(appendTenantWhere({ id: updatePostDto.id }), updatePostDto);
    return ResultData.ok(res);
  }

  async remove(postIds: number[]) {
    await this.sysPostEntityRep.softDelete(appendTenantWhere({ id: In(postIds) }));
    return ResultData.ok();
  }

  /**
   * 导出岗位管理数据为xlsx文件
   * @param res
   */
  async export(res: Response, body: ListPostDto) {
    delete body.pageNum;
    delete body.pageSize;
    const list = await this.findAll(body);
    const options = {
      sheetName: '岗位数据',
      data: list.data.list,
      header: [
        { title: '岗位序号', dataIndex: 'id' },
        { title: '岗位编码', dataIndex: 'code' },
        { title: '岗位名称', dataIndex: 'name' },
        { title: '岗位排序', dataIndex: 'sort' },
        { title: '状态', dataIndex: 'status' },
      ],
    };
    ExportTable(options, res);
  }
}
