import * as Lodash from 'lodash';
import { GenConstants } from '../../../../../common/constant/gen.constant';
export const dtoTem = (options) => {
  const { BusinessName, primaryKey } = options;
  const createFields = buildCreateFields(options);
  const listFields = buildListFields(options);

  return `
import { IsString, IsNumber, IsBoolean, IsDate, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { PagingDto } from '../../../../../common/dto/index';
import { CharEnum } from '../../../../../common/enum/index';
import { Type } from 'class-transformer';


export class Create${Lodash.upperFirst(BusinessName)}Dto {
${createFields}
}

export class Update${Lodash.upperFirst(BusinessName)}Dto extends PartialType(Create${Lodash.upperFirst(BusinessName)}Dto) {
${buildPrimaryKeyField(options, primaryKey)}
}

export class List${Lodash.upperFirst(BusinessName)}Dto extends PagingDto {
${listFields}
}
`;
};

const AUDIT_FIELDS = ['createdBy', 'updatedBy', 'createTime', 'updateTime', 'deleteTime'];

const buildCreateFields = (options) => {
  const { columns } = options;
  return (columns || [])
    .filter((c) => Number(c.isPk) !== 2)
    .filter((c) => Number(c.isInsert) === 2)
    .filter((c) => !AUDIT_FIELDS.includes(c.javaField))
    .map((column) => buildDtoField(column, { optional: Number(column.isRequired) !== 2 }))
    .join('\n');
};

const buildListFields = (options) => {
  const { columns } = options;
  return (columns || [])
    .filter((c) => Number(c.isQuery) === 2)
    .filter((c) => !AUDIT_FIELDS.includes(c.javaField))
    .map((column) => buildDtoField(column, { optional: true, forQuery: true }))
    .join('\n');
};

function buildPrimaryKeyField(options, primaryKey) {
  const { columns } = options;
  const pk = (columns || []).find((c) => c.javaField === primaryKey) || (columns || []).find((c) => Number(c.isPk) === 2);
  if (!pk) return `\t@ApiProperty({ required: true })\n\t@IsNumber()\n\t@Type(() => Number)\n\tid: number;`;
  return buildDtoField(pk, { optional: false, forceRequired: true });
}

function buildDtoField(column, config) {
  const { javaType, javaField, columnComment, columnType, queryType } = column;
  const required = config.forceRequired ? true : !config.optional;
  const tsType = normalizeDtoTsType(javaType, config.forQuery ? queryType : undefined);
  const comment = escapeString(columnComment || javaField);
  const decorators = [
    `\t@ApiProperty({${columnType === 'char' ? 'enum: CharEnum, ' : ''}required: ${required}, description: '${comment}'})`,
    !required && `\t@IsOptional()`,
    '\t' + getValidatorDecorator(javaType, config.forQuery ? queryType : undefined),
  ]
    .filter(Boolean)
    .join('\n');

  return `\t${decorators}\n\t${javaField}${required ? '' : '?'}: ${tsType};\n`;
}

function getValidatorDecorator(javaType, queryType) {
  switch (javaType) {
    case 'String':
      return `@IsString()`;
    case 'Number':
      return `@IsNumber()\n\t@Type(() => Number)`;
    case 'Boolean':
      return `@IsBoolean()`;
    case 'Date':
      return queryType === GenConstants.QUERY_BETWEEN ? '@IsArray()\n\t@IsString({ each: true })' : '@IsString()';
    default:
      return ``;
  }
}

function normalizeDtoTsType(str, queryType) {
  if (str === 'Date') return queryType === GenConstants.QUERY_BETWEEN ? 'Array<string>' : 'string';
  if (str === 'Boolean') return 'boolean';
  if (str === 'Number') return 'number';
  return 'string';
}

function escapeString(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
