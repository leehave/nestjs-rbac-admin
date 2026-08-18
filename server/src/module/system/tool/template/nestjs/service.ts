import * as Lodash from 'lodash';
import { GenConstants } from '../../../../../common/constant/gen.constant';

export const serviceTem = (options) => {
  const { BusinessName, primaryKey, businessName } = options;
  return `
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { ResultData } from '../../../../../common/utils/result';
import { Create${Lodash.upperFirst(BusinessName)}Dto, Update${Lodash.upperFirst(BusinessName)}Dto, List${Lodash.upperFirst(BusinessName)}Dto } from './dto/${businessName}.dto';
import { ${Lodash.upperFirst(BusinessName)}Entity } from './entities/${businessName}.entity';
import { isEmpty } from '../../../../../common/utils';
${getTenantImport(options)}

@Injectable()
export class ${Lodash.upperFirst(BusinessName)}Service {
  constructor(
    @InjectRepository(${Lodash.upperFirst(BusinessName)}Entity)
    private readonly ${businessName}EntityRep: Repository<${Lodash.upperFirst(BusinessName)}Entity>,
  ) {}

  async create(create${Lodash.upperFirst(BusinessName)}Dto: Create${Lodash.upperFirst(BusinessName)}Dto) {
    await this.${businessName}EntityRep.save(create${Lodash.upperFirst(BusinessName)}Dto);
    return ResultData.ok();
  }

  async findAll(query: List${Lodash.upperFirst(BusinessName)}Dto) {
    const entity = this.${businessName}EntityRep.createQueryBuilder('entity');
    entity.where('entity.deleteTime IS NULL');
${getTenantWhere(options)}
    ${getListQueryStr(options)}
    ${getListSelectStr(options)}

    entity.skip(Number(query.pageSize) * (Number(query.pageNum) - 1)).take(Number(query.pageSize));
    if (query.orderByColumn && query.isAsc) {
      const key = query.isAsc === 'ascending' ? 'ASC' : 'DESC';
      entity.orderBy(\`entity.\${query.orderByColumn}\`, key);
    }

    const [list, total] = await entity.getManyAndCount();

    return ResultData.ok({
      list,
      total,
    });
  }

  async findOne(${primaryKey}: number) {
    const res = await this.${businessName}EntityRep.findOne({ where: { ${primaryKey}: ${primaryKey}, deleteTime: IsNull() } as any });
    return ResultData.ok(res || null);
  }

  async update(update${Lodash.upperFirst(BusinessName)}Dto: Update${Lodash.upperFirst(BusinessName)}Dto) {
    await this.${businessName}EntityRep.update({ ${primaryKey}: update${Lodash.upperFirst(BusinessName)}Dto.${primaryKey} } as any, update${Lodash.upperFirst(BusinessName)}Dto as any);
    return ResultData.ok();
  }

  async remove(${primaryKey}s: number[]) {
    await this.${businessName}EntityRep.update({ ${primaryKey}: In(${primaryKey}s) } as any, { deleteTime: new Date() } as any);
    return ResultData.ok();
  }
}`;
};

/**
 * 列表返回字段
 * @param options
 * @returns
 */
const getListFiledSelectStr = (options) => {
  const { columns } = options;
  const auditFields = ['createdBy', 'updatedBy', 'createTime', 'updateTime', 'deleteTime'];
  return columns
    .filter((column) => column.isList == 2)
    .filter((column) => !auditFields.includes(column.javaField))
    .map((column) => {
      return `"entity.${column.javaField}"`;
    })
    .join(',');
};

const getListSelectStr = (options) => {
  const filed = getListFiledSelectStr(options);
  if (!filed) return '';
  return `entity.select([${filed}]);`;
};

/**
 * 列表查询条件
 * @param options
 * @returns
 */
const getListQueryStr = (options) => {
  const { columns } = options;
  const auditFields = ['createdBy', 'updatedBy', 'createTime', 'updateTime', 'deleteTime'];
  return columns
    .filter((column) => column.isQuery == 2)
    .filter((column) => !auditFields.includes(column.javaField))
    .map((column) => {
      switch (column.queryType) {
        case GenConstants.QUERY_EQ:
          return `if (!isEmpty(query.${column.javaField})) {
      entity.andWhere("entity.${column.javaField} = :${column.javaField}", { ${column.javaField}: query.${column.javaField} });
    }`;
        case GenConstants.QUERY_NE:
          return `if (!isEmpty(query.${column.javaField})) {
      entity.andWhere("entity.${column.javaField} != :${column.javaField}", { ${column.javaField}: query.${column.javaField} });
    }`;
        case GenConstants.QUERY_GT:
          return `if (query.${column.javaField}) {
      entity.andWhere("entity.${column.javaField} > :${column.javaField}", { ${column.javaField}: query.${column.javaField} });
    }`;
        case GenConstants.QUERY_GTE:
          return `if (!isEmpty(query.${column.javaField})) {
      entity.andWhere("entity.${column.javaField} >= :${column.javaField}", { ${column.javaField}: query.${column.javaField} });
    }`;
        case GenConstants.QUERY_LT:
          return `if (!isEmpty(query.${column.javaField})) {
      entity.andWhere("entity.${column.javaField} < :${column.javaField}", { ${column.javaField}: query.${column.javaField} });
    }`;
        case GenConstants.QUERY_LTE:
          return `if (!isEmpty(query.${column.javaField})) {
      entity.andWhere("entity.${column.javaField} <= :${column.javaField}", { ${column.javaField}: query.${column.javaField} });
    }`;
        case GenConstants.QUERY_LIKE:
          return `if (!isEmpty(query.${column.javaField})) {
      entity.andWhere("entity.${column.javaField} LIKE :${column.javaField}", { ${column.javaField}: \`%\${query.${column.javaField}}%\` });
    }`;
        case GenConstants.QUERY_BETWEEN:
          return `if (!isEmpty(query.${column.javaField})) {
      entity.andWhere("entity.${column.javaField} BETWEEN :start AND :end", { start: query.${column.javaField}[0], end: query.${column.javaField}[1] });
    }`;
        default:
          return ``;
      }
    })
    .join('\n    ');
};

const getTenantImport = (options) => {
  const hasTenantId = (options?.columns || []).some((c) => c.javaField === 'tenantId');
  return hasTenantId ? `import { applyTenantFilter } from '../../../../../common/utils/tenant.util';` : '';
};

const getTenantWhere = (options) => {
  const hasTenantId = (options?.columns || []).some((c) => c.javaField === 'tenantId');
  return hasTenantId ? `    applyTenantFilter(entity, 'entity');` : '';
};
