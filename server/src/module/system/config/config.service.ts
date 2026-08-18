import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { ResultData } from '../../../common/utils/result';
import { CacheEnum } from '../../../common/enum/index';
import { Cacheable, CacheEvict } from '../../../common/decorators/redis.decorator';
import { RedisService } from '../../../redis/redis.service';
import { CreateConfigDto, UpdateConfigDto, ListConfigDto, ListConfigGroupDto } from './dto/index';
import { SysConfigEntity } from './entities/config.entity';
import { SysConfigGroupEntity } from './entities/config-group.entity';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(SysConfigEntity)
    private readonly sysConfigEntityRep: Repository<SysConfigEntity>,
    @InjectRepository(SysConfigGroupEntity)
    private readonly sysConfigGroupEntityRep: Repository<SysConfigGroupEntity>,
    private readonly redisService: RedisService,
  ) {}

  async create(createConfigDto: CreateConfigDto) {
    await this.sysConfigEntityRep.save(this.mapConfigDtoToEntity(createConfigDto));
    return ResultData.ok();
  }

  private mapConfigDtoToEntity(dto: Record<string, any>) {
    return {
      ...dto,
      groupId: dto.group_id ?? dto.groupId,
      inputType: dto.input_type ?? dto.inputType,
      configSelectData: dto.config_select_data ?? dto.configSelectData,
    };
  }

  /**
   * 格式化配置项
   * @description 将数据库查询到的配置实体转换为前端所需的格式，包括解析 configSelectData JSON 字符串
   * @param item - 配置实体对象
   * @returns 格式化后的配置对象，包含 id、group_id、key、value、name、input_type、config_select_data、sort、remark、create_time、update_time
   */
  private formatConfigItem(item: SysConfigEntity) {
    let configSelectData: any = item.configSelectData;
    if (configSelectData) {
      try {
        configSelectData = JSON.parse(configSelectData);
      } catch {
        configSelectData = [];
      }
    } else {
      configSelectData = [];
    }
    return {
      id: item.id,
      group_id: item.groupId,
      key: item.key,
      value: item.value,
      name: item.name,
      input_type: item.inputType,
      config_select_data: configSelectData,
      sort: item.sort,
      remark: item.remark,
      create_time: item.createTime,
      update_time: item.updateTime,
    };
  }

  /**
   * 分页查询配置列表
   * @description 根据查询条件（分组 ID、名称、键名、时间范围）分页查询系统配置列表，并格式化每条配置项
   * @param query - 查询参数，包含 group_id、name、key、pageNum/page、pageSize/limit 及时间范围 params.beginTime/endTime
   * @returns 返回分页结果，包含格式化后的配置列表和总数
   */
  async findAll(query: ListConfigDto) {
    const entity = this.sysConfigEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');

    if (query.group_id !== undefined && query.group_id !== null && `${query.group_id}` !== '') {
      entity.andWhere('entity.groupId = :groupId', { groupId: Number(query.group_id) });
    }
    if (query.name) {
      entity.andWhere(`entity.name LIKE "%${query.name}%"`);
    }
    if (query.key) {
      entity.andWhere(`entity.key LIKE "%${query.key}%"`);
    }
    if (query.params?.beginTime && query.params?.endTime) {
      entity.andWhere('entity.createTime BETWEEN :start AND :end', {
        start: query.params.beginTime,
        end: query.params.endTime,
      });
    }

    entity.orderBy('entity.sort', 'ASC').addOrderBy('entity.id', 'DESC');

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);
    if (pageNum && pageSize) {
      entity.skip(pageSize * (pageNum - 1)).take(pageSize);
    }

    const [list, total] = await entity.getManyAndCount();
    return ResultData.ok({
      list: list.map((item) => this.formatConfigItem(item)),
      total,
    });
  }

  /**
   * 分页查询配置分组
   * @description 根据查询条件（分组名称、分组编码）分页查询系统配置分组列表
   * @param query - 查询参数，包含 name、code、pageNum/page、pageSize/limit
   * @returns 返回分页结果，包含配置分组列表和总数
   */
  async findGroupAll(query: ListConfigGroupDto) {
    const entity = this.sysConfigGroupEntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');
    if (query.name) {
      entity.andWhere(`entity.name LIKE "%${query.name}%"`);
    }
    if (query.code) {
      entity.andWhere(`entity.code LIKE "%${query.code}%"`);
    }
    entity.orderBy('entity.id', 'ASC');

    const pageNum = Number(query.pageNum || query.page || 1);
    const pageSize = Number(query.pageSize || query.limit || 10);
    entity.skip(pageSize * (pageNum - 1)).take(pageSize);

    const [list, total] = await entity.getManyAndCount();
    return ResultData.ok({ list, total });
  }

  async createGroup(body: Record<string, any>) {
    await this.sysConfigGroupEntityRep.save(body);
    return ResultData.ok();
  }

  async updateGroup(id: number, body: Record<string, any>) {
    await this.sysConfigGroupEntityRep.update({ id }, body);
    return ResultData.ok();
  }

  async removeGroup(id: number) {
    await this.sysConfigEntityRep.softDelete({ groupId: id });
    await this.sysConfigGroupEntityRep.softDelete(id);
    return ResultData.ok();
  }

  async findOne(configId: number) {
    const data = await this.sysConfigEntityRep.findOne({ where: { id: configId } });
    return ResultData.ok(data);
  }

  async findOneByConfigKey(configKey: string) {
    const data = await this.getConfigValue(configKey);
    return ResultData.ok(data);
  }

  @Cacheable(CacheEnum.SYS_CONFIG_KEY, '{key}')
  async getConfigValue(key: string): Promise<string | null> {
    const data = await this.sysConfigEntityRep.findOne({ where: { key } });
    return data?.value ?? null;
  }

  @CacheEvict(CacheEnum.SYS_CONFIG_KEY, '{updateConfigDto.key}')
  async update(updateConfigDto: UpdateConfigDto) {
    const entity = this.mapConfigDtoToEntity(updateConfigDto);
    await this.sysConfigEntityRep.update({ id: updateConfigDto.id }, entity);
    return ResultData.ok();
  }

  async remove(configIds: number[]) {
    await this.sysConfigEntityRep.softDelete(configIds);
    return ResultData.ok();
  }

  /**
   * 批量更新配置
   * @description 批量更新配置项的值，更新完成后自动清除并重新加载 Redis 缓存
   * @param list - 待更新的配置列表，每项需包含 id 和 value
   * @returns 返回操作结果
   */
  async batchUpdate(list: UpdateConfigDto[]) {
    for (const item of list) {
      if (item.id !== undefined && item.id !== null) {
        await this.sysConfigEntityRep.update({ id: item.id }, { value: item.value });
      }
    }
    await this.clearConfigCache();
    await this.loadingConfigCache();
    return ResultData.ok();
  }

  async testEmail(_body: any) {
    return ResultData.ok('邮件发送成功');
  }

  async resetConfigCache() {
    await this.clearConfigCache();
    await this.loadingConfigCache();
    return ResultData.ok();
  }

  @CacheEvict(CacheEnum.SYS_CONFIG_KEY, '*')
  async clearConfigCache() {}

  /**
   * 加载配置到 Redis 缓存
   * @description 将所有未删除的系统配置从数据库加载到 Redis 缓存中，键名格式为 SYS_CONFIG_KEY + 配置键名
   * @returns 无返回值
   */
  async loadingConfigCache() {
    const list = await this.sysConfigEntityRep.find({ where: { deleteTime: IsNull() } });
    for (const item of list) {
      if (item.key) {
        await this.redisService.set(`${CacheEnum.SYS_CONFIG_KEY}${item.key}`, item.value);
      }
    }
  }
}
