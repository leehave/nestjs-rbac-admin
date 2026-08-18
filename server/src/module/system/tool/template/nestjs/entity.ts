import * as Lodash from 'lodash';

export const entityTem = (options) => {
  const { BusinessName, tableName, tableComment } = options;

  const contentTem = content(options);
  return `
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../../../common/entities/base';

@Entity('${tableName}', {
    comment: '${tableComment}',
})
export class ${Lodash.upperFirst(BusinessName)}Entity extends BaseEntity {
${contentTem}
}
`;
};

const content = (options) => {
  const { columns } = options;
  const auditFields = ['createdBy', 'updatedBy', 'createTime', 'updateTime', 'deleteTime'];
  const list = (columns || []).filter((c) => !auditFields.includes(c.javaField));
  list.sort((a, b) => Number(b.isPk) - Number(a.isPk));

  let html = ``;
  list.forEach((column) => {
    const { javaType, javaField, isPk, columnType, columnComment, columnDefault, isIncrement } = column;
    const type = formatTsType(javaType);
    const dbName = escapeString(column.columnName || '');
    const comment = escapeString(columnComment || '');
    const meta = parseMysqlType(columnType);
    const defaultStr = formatDefault(meta.baseType, columnDefault);
    const nullableStr = columnDefault === null || columnDefault === undefined ? ', nullable: true' : '';
    const unsignedStr = meta.unsigned ? ', unsigned: true' : '';
    const lengthStr = meta.length && ['varchar', 'char', 'nvarchar', 'varchar2'].includes(meta.baseType) ? `, length: ${meta.length}` : '';

    if (Number(isPk) === 2) {
      html += `\t@ApiProperty({ type: Number, description: '${comment || dbName}' })\n`;
      if (Number(isIncrement) === 1) {
        html += `\t@PrimaryGeneratedColumn({ type: '${meta.baseType}', name: '${dbName}'${unsignedStr}, comment: '${comment}' })\n\tpublic ${javaField}: ${type};\n\n`;
      } else {
        html += `\t@PrimaryGeneratedColumn({ type: '${meta.baseType}', name: '${dbName}'${unsignedStr}, comment: '${comment}' })\n\tpublic ${javaField}: ${type};\n\n`;
      }
    } else {
      html += `\t@Column({ type: '${meta.baseType}', name: '${dbName}'${lengthStr}${unsignedStr}, default: ${defaultStr}${nullableStr}, comment: '${comment}' })\n\tpublic ${javaField}: ${type};\n\n`;
    }
  });

  return html.trimEnd();
};

function parseMysqlType(raw) {
  const source = String(raw || '').trim().toLowerCase();
  const unsigned = source.includes('unsigned');
  const base = source.split('(')[0].trim().split(' ')[0];
  const lenMatch = source.match(/\((\d+)\)/);
  const length = lenMatch ? Number(lenMatch[1]) : null;
  const baseType = base === 'integer' ? 'int' : base;
  return { baseType, length, unsigned };
}

function formatDefault(baseType, value) {
  if (value === undefined) return 'null';
  if (value === null) return 'null';
  const v = String(value);
  if (['varchar', 'char', 'nvarchar', 'varchar2', 'text', 'tinytext', 'mediumtext', 'longtext'].includes(baseType)) {
    return `'${escapeString(v)}'`;
  }
  if (['datetime', 'timestamp', 'date', 'time'].includes(baseType)) {
    return 'null';
  }
  if (v === '') return 'null';
  return v;
}

function escapeString(str) {
  return String(str || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatTsType(javaType) {
  if (javaType === 'Date') return 'Date';
  if (javaType === 'Boolean') return 'boolean';
  if (javaType === 'Number') return 'number';
  return 'string';
}
