import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express-serve-static-core';
import { Repository, In, IsNull } from 'typeorm';
import { ResultData } from '../../../common/utils/result';
import { CacheEnum } from '../../../common/enum/index';
import { ExportTable } from '../../../common/utils/export';
import { DictTypeEntity } from './entities/dict.type.entity';
import { DictDataEntity } from './entities/dict.data.entity';
import {
  CreateDictTypeDto,
  UpdateDictTypeDto,
  ListDictTypeDto,
  CreateDictDataDto,
  UpdateDictDataDto,
  ListDictDataDto,
} from './dto/index';
import { RedisService } from '../../../redis/redis.service';

/** Redis 键：全量字典数据 */
const DICT_ALL_CACHE_KEY = 'dict:all';
/** 全量字典缓存 TTL（毫秒）：2 小时 */
const DICT_ALL_CACHE_TTL_MS = 7200_000;

@Injectable()
export class DictService {
  private readonly logger = new Logger(DictService.name);
  constructor(
    @InjectRepository(DictTypeEntity)
    private readonly dictTypeEntityRep: Repository<DictTypeEntity>,
    @InjectRepository(DictDataEntity)
    private readonly dictDataEntityRep: Repository<DictDataEntity>,
    private readonly redisService: RedisService,
  ) {}
  async createType(CreateDictTypeDto: CreateDictTypeDto) {
    await this.dictTypeEntityRep.save(CreateDictTypeDto);
    await this.clearAllDictCache();
    return ResultData.ok();
  }

  async deleteType(dictIds: number[]) {
    await this.dictTypeEntityRep.softDelete(dictIds);
    await this.clearAllDictCache();
    return ResultData.ok();
  }

  async updateType(updateDictTypeDto: UpdateDictTypeDto) {
    await this.dictTypeEntityRep.update({ id: updateDictTypeDto.id }, updateDictTypeDto);
    await this.clearAllDictCache();
    return ResultData.ok();
  }

  /**
   * 分页查询字典类型列表。
   *
   * 支持按字典名称、字典编码、状态进行模糊或精确筛选，
   * 以及按创建时间范围查询，返回分页后的字典类型列表及总数。
   *
   * @param query - 查询参数，包含名称、编码、状态、时间范围及分页信息。
   * @returns 返回包含列表、总数、页码、每页大小的分页结果。
   */
  async findAllType(query: ListDictTypeDto) {
    const entity = this.dictTypeEntityRep.createQueryBuilder('entity');
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

    if (query.params?.beginTime && query.params?.endTime) {
      entity.andWhere('entity.createTime BETWEEN :start AND :end', { start: query.params.beginTime, end: query.params.endTime });
    }

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);
    entity.skip(pageSize * (pageNum - 1)).take(pageSize);

    const [list, total] = await entity.getManyAndCount();

    return ResultData.ok({
      list,
      total,
      page: pageNum,
      size: pageSize,
    });
  }

  async findOneType(dictId: number) {
    const data = await this.dictTypeEntityRep.findOne({
      where: {
        id: dictId,
        deleteTime: IsNull(),
      },
    });
    return ResultData.ok(data);
  }

  async findOptionselect() {
    const data = await this.dictTypeEntityRep.find({
      where: {
        deleteTime: IsNull(),
      },
    });
    return ResultData.ok(data);
  }

  /**
   * 获取所有字典数据（按 code 分组，供前端 dictStore 使用）
   * 结果缓存至 Redis（键 dict:all，TTL 2h），字典 CRUD 操作后自动清除。
   */
  async getAllData() {
    const cached = await this.redisService.get(DICT_ALL_CACHE_KEY);
    if (cached) return cached;

    const dictTypes = await this.dictTypeEntityRep.find({
      where: {
        deleteTime: IsNull(),
        status: 1,
      },
    });

    const result: Record<string, Array<{ id: number; label: string; value: string; color: string; disabled: boolean }>> = {};

    for (const dictType of dictTypes) {
      const dataList = await this.dictDataEntityRep.find({
        where: {
          deleteTime: IsNull(),
          status: 1,
          typeId: dictType.id,
        },
        order: { sort: 'ASC' },
      });

      result[dictType.code] = dataList.map((item) => ({
        id: Number(item.id),
        label: item.label,
        value: item.value,
        color: item.color || '',
        disabled: item.status !== 1,
      }));
    }

    await this.redisService.set(DICT_ALL_CACHE_KEY, result, DICT_ALL_CACHE_TTL_MS);
    return result;
  }

  /** 清除全量字典缓存（dict:all）及所有单码缓存（sys_dict:*） */
  private async clearAllDictCache(): Promise<void> {
    try {
      // 清除全量缓存
      await this.redisService.del(DICT_ALL_CACHE_KEY);
      // 清除单码缓存
      const keys = await this.redisService.keys(`${CacheEnum.SYS_DICT_KEY}*`);
      if (keys?.length) {
        await this.redisService.del(keys);
      }
      this.logger.log('字典缓存已清除');
    } catch (err) {
      this.logger.warn(`清除字典缓存失败: ${(err as Error)?.message}`);
    }
  }

  /**
   * 将传入的字典数据 DTO 映射为数据库实体格式。
   *
   * 兼容前端传入的驼峰和下划线两种字段命名风格，统一转换为实体所需的字段名。
   *
   * @param dto - 原始字典数据对象，可能包含 type_id 或 typeId 等字段。
   * @returns 映射后的字典数据实体对象。
   */
  private mapDictDataDto(dto: Record<string, any>) {
    return {
      typeId: dto.type_id ?? dto.typeId,
      label: dto.label,
      value: dto.value,
      color: dto.color,
      code: dto.code,
      sort: dto.sort,
      status: dto.status,
      remark: dto.remark,
    };
  }

  /**
   * 格式化字典数据实体为前端所需的展示格式。
   *
   * 将实体中的驼峰字段（如 typeId、createTime）转换为下划线风格（如 type_id、create_time），
   * 便于前端直接消费。
   *
   * @param item - 字典数据实体对象。
   * @returns 格式化后的字典数据对象，字段为下划线命名风格。
   */
  private formatDictDataItem(item: DictDataEntity) {
    return {
      id: item.id,
      type_id: item.typeId,
      label: item.label,
      value: item.value,
      color: item.color,
      code: item.code,
      sort: item.sort,
      status: item.status,
      remark: item.remark,
      create_time: item.createTime,
      update_time: item.updateTime,
    };
  }

  async createDictData(createDictDataDto: CreateDictDataDto) {
    const entity = this.mapDictDataDto(createDictDataDto);
    await this.dictDataEntityRep.save(entity);
    await this.clearAllDictCache();
    return ResultData.ok();
  }

  async deleteDictData(dictIds: number[]) {
    await this.dictDataEntityRep.softDelete(dictIds);
    await this.clearAllDictCache();
    return ResultData.ok();
  }

  async updateDictData(updateDictDataDto: UpdateDictDataDto) {
    const entity = this.mapDictDataDto(updateDictDataDto);
    await this.dictDataEntityRep.update({ id: updateDictDataDto.id }, entity);
    await this.clearAllDictCache();
    return ResultData.ok();
  }

  /**
   * 分页查询字典数据列表。
   *
   * 支持按字典标签、类型 ID、状态进行筛选，
   * 返回分页后的字典数据列表，数据项经 formatDictDataItem 格式化后返回。
   *
   * @param query - 查询参数，包含标签、类型 ID、状态及分页信息。
   * @returns 返回包含格式化后的列表及总数的分页结果。
   */
  async findAllData(query: ListDictDataDto) {
    const entity = this.dictDataEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');
    if (query.label) {
      entity.andWhere(`entity.label LIKE "%${query.label}%"`);
    }

    if (query.type_id !== undefined && query.type_id !== null) {
      entity.andWhere('entity.typeId = :typeId', { typeId: query.type_id });
    }

    if (query.status !== undefined && query.status !== null) {
      entity.andWhere('entity.status = :status', { status: query.status });
    }
    if (query.pageSize && query.pageNum) {
      entity.skip(query.pageSize * (query.pageNum - 1)).take(query.pageSize);
    }

    const [list, total] = await entity.getManyAndCount();

    return ResultData.ok({
      list: list.map((item) => this.formatDictDataItem(item)),
      total,
    });
  }

  /**
   * 根据字典code查询字典数据列表。
   *
   * @param code 字典code。
   * @returns 返回查询到的数据列表，如果未查询到则返回空。
   */
  async findOneDataType(code: string) {
    let data = await this.redisService.get(`${CacheEnum.SYS_DICT_KEY}${code}`);

    if (data) {
      return ResultData.ok(data);
    }

    const dictType = await this.dictTypeEntityRep.findOne({
      where: { code, deleteTime: IsNull() },
    });

    if (!dictType) {
      return ResultData.ok([]);
    }

    data = await this.dictDataEntityRep.find({
      where: {
        typeId: dictType.id,
        deleteTime: IsNull(),
      },
      order: { sort: 'ASC' },
    });

    await this.redisService.set(`${CacheEnum.SYS_DICT_KEY}${code}`, data);
    return ResultData.ok(data);
  }

  async findOneDictData(dictCode: number) {
    const data = await this.dictDataEntityRep.findOne({
      where: {
        id: dictCode,
        deleteTime: IsNull(),
      },
    });
    return ResultData.ok(data);
  }

  /**
   * 导出字典类型数据为xlsx文件
   * @param res
   */
  async export(res: Response, body: ListDictTypeDto) {
    delete body.pageNum;
    delete body.pageSize;
    const list = await this.findAllType(body);
    const options = {
      sheetName: '字典数据',
      data: list.data.list,
      header: [
        { title: '字典主键', dataIndex: 'id' },
        { title: '字典名称', dataIndex: 'name' },
        { title: '字典编码', dataIndex: 'code' },
        { title: '状态', dataIndex: 'status' },
      ],
    };
    ExportTable(options, res);
  }

  /**
   * 导出字典数据为xlsx文件
   * @param res
   */
  async exportData(res: Response, body: ListDictDataDto) {
    delete body.pageNum;
    delete body.pageSize;
    const list = await this.findAllData(body);
    const options = {
      sheetName: '字典数据',
      data: list.data.list,
      header: [
        { title: '字典主键', dataIndex: 'id' },
        { title: '字典标签', dataIndex: 'label' },
        { title: '字典键值', dataIndex: 'value' },
        { title: '备注', dataIndex: 'remark' },
      ],
    };
    ExportTable(options, res);
  }

  /**
   * 刷新字典缓存
   * @returns
   */
  async resetDictCache() {
    await this.clearDictCache();
    await this.loadingDictCache();
    return ResultData.ok();
  }

  /**
   * 删除字典缓存
   * @returns
   */
  async clearDictCache() {
    const keys = await this.redisService.keys(`${CacheEnum.SYS_DICT_KEY}*`);
    if (keys && keys.length > 0) {
      await this.redisService.del(keys);
    }
  }

  /**
   * 加载字典缓存
   * @returns
   */
  async loadingDictCache() {
    const dictTypes = await this.dictTypeEntityRep.find({
      where: { deleteTime: IsNull(), status: 1 },
    });

    for (const dictType of dictTypes) {
      const dataList = await this.dictDataEntityRep.find({
        where: { typeId: dictType.id, deleteTime: IsNull(), status: 1 },
        order: { sort: 'ASC' },
      });
      if (dictType.code) {
        this.redisService.set(`${CacheEnum.SYS_DICT_KEY}${dictType.code}`, dataList);
      }
    }
  }
}
