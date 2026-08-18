import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ResultData } from '../../../common/utils/result';
import { PluginEntity } from './entities/plugin.entity';
import { CreatePluginDto, UpdatePluginConfigDto, ListPluginDto } from './dto/index';

@Injectable()
export class PluginService {
  constructor(
    @InjectRepository(PluginEntity)
    private readonly pluginRepo: Repository<PluginEntity>,
  ) {}

  /**
   * 创建插件
   * @param createPluginDto - 插件创建数据传输对象
   * @returns 创建结果
   */
  async create(createPluginDto: CreatePluginDto) {
    const existing = await this.pluginRepo.findOne({ where: { name: createPluginDto.name } });
    if (existing) {
      return ResultData.fail(400, `插件标识 "${createPluginDto.name}" 已存在`);
    }
    const res = await this.pluginRepo.save({
      ...createPluginDto,
      status: 0,
      config: '{}',
    });
    return ResultData.ok(res);
  }

  /**
   * 查询插件列表（分页/条件过滤）
   * @param query - 查询参数：可传入 name（插件名称模糊搜索）、status（状态筛选）、pageSize/pageNum（分页参数）
   * @returns 包含列表和总数的分页结果
   */
  async findAll(query: ListPluginDto) {
    const entity = this.pluginRepo.createQueryBuilder('entity');

    if (query.name) {
      entity.andWhere('entity.name LIKE :name', { name: `%${query.name}%` });
    }

    if (query.status !== undefined) {
      entity.andWhere('entity.status = :status', { status: query.status });
    }

    if (query.pageSize && query.pageNum) {
      entity.skip(query.pageSize * (query.pageNum - 1)).take(query.pageSize);
    }

    const [list, total] = await entity.getManyAndCount();
    return ResultData.ok({ list, total });
  }

  async findOne(name: string) {
    const data = await this.pluginRepo.findOne({ where: { name } });
    return ResultData.ok(data);
  }

  /**
   * 安装插件
   * @param createPluginDto - 插件创建数据传输对象
   * @returns 安装结果
   * @description 若插件已存在但未安装（status === 0），则更新信息并标记为已安装；否则直接新建并安装。
   */
  async install(createPluginDto: CreatePluginDto) {
    const existing = await this.pluginRepo.findOne({ where: { name: createPluginDto.name } });
    if (existing) {
      if (existing.status !== 0) {
        return ResultData.fail(400, `插件 "${createPluginDto.name}" 已安装`);
      }
      // 已存在但未安装 => 更新并安装
      await this.pluginRepo.update(
        { id: existing.id },
        { ...createPluginDto, status: 1, config: '{}' } as any,
      );
      return ResultData.ok();
    }

    await this.pluginRepo.save({
      ...createPluginDto,
      status: 1,
      config: '{}',
    });
    return ResultData.ok();
  }

  /**
   * 卸载插件
   * @param name - 插件标识名称
   * @returns 卸载结果
   * @description 将插件状态置为未安装（status = 0），不会删除记录。
   */
  async uninstall(name: string) {
    const existing = await this.pluginRepo.findOne({ where: { name } });
    if (!existing) {
      return ResultData.fail(404, `插件 "${name}" 不存在`);
    }
    await this.pluginRepo.update({ id: existing.id }, { status: 0 } as any);
    return ResultData.ok();
  }

  /**
   * 启用插件
   * @param name - 插件标识名称
   * @returns 启用结果
   * @description 将已安装的插件状态设为已启用（status = 2）。若插件未安装则返回错误。
   */
  async enable(name: string) {
    const existing = await this.pluginRepo.findOne({ where: { name } });
    if (!existing) {
      return ResultData.fail(404, `插件 "${name}" 不存在`);
    }
    if (existing.status === 0) {
      return ResultData.fail(400, `插件 "${name}" 未安装，请先安装`);
    }
    await this.pluginRepo.update({ id: existing.id }, { status: 2 } as any);
    return ResultData.ok();
  }

  async disable(name: string) {
    const existing = await this.pluginRepo.findOne({ where: { name } });
    if (!existing) {
      return ResultData.fail(404, `插件 "${name}" 不存在`);
    }
    await this.pluginRepo.update({ id: existing.id }, { status: 1 } as any);
    return ResultData.ok();
  }

  /**
   * 获取插件配置
   * @param name - 插件标识名称
   * @returns 插件配置对象（已解析的 JSON）
   * @description 从数据库中读取插件的 config 字段并解析为 JSON 对象返回。解析失败时返回空对象。
   */
  async getConfig(name: string) {
    const existing = await this.pluginRepo.findOne({ where: { name } });
    if (!existing) {
      return ResultData.fail(404, `插件 "${name}" 不存在`);
    }
    let config = {};
    try {
      config = JSON.parse(existing.config || '{}');
    } catch {
      config = {};
    }
    return ResultData.ok(config);
  }

  /**
   * 更新插件配置
   * @param name - 插件标识名称
   * @param updateConfigDto - 更新配置的数据传输对象，包含新的配置内容
   * @returns 更新结果
   * @description 仅允许对已安装（status !== 0）的插件更新配置。
   */
  async updateConfig(name: string, updateConfigDto: UpdatePluginConfigDto) {
    const existing = await this.pluginRepo.findOne({ where: { name } });
    if (!existing) {
      return ResultData.fail(404, `插件 "${name}" 不存在`);
    }
    if (existing.status === 0) {
      return ResultData.fail(400, `插件 "${name}" 未安装`);
    }
    await this.pluginRepo.update({ id: existing.id }, { config: updateConfigDto.config } as any);
    return ResultData.ok();
  }

  /**
   * 插件健康诊断
   * @returns 诊断报告，包含总插件数、已安装数、已启用数、未安装数、配置异常列表及整体健康状态
   * @description 遍历所有插件，统计状态分布并检查配置 JSON 格式是否合法。
   */
  async doctor() {
    const total = await this.pluginRepo.count();
    const installed = await this.pluginRepo.count({ where: { status: 1 } });
    const enabled = await this.pluginRepo.count({ where: { status: 2 } });
    const notInstalled = await this.pluginRepo.count({ where: { status: 0 } });

    const all = await this.pluginRepo.find();
    let configErrors: any[] = [];
    for (const plugin of all) {
      if (plugin.config && plugin.config !== '{}') {
        try {
          JSON.parse(plugin.config);
        } catch {
          configErrors.push({ name: plugin.name, title: plugin.title, message: '配置JSON格式错误' });
        }
      }
    }

    return ResultData.ok({
      total,
      installed,
      enabled,
      notInstalled,
      configErrors,
      healthy: configErrors.length === 0,
    });
  }
}
