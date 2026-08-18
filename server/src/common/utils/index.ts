import lodash from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import dayjs from 'dayjs';
import isLeapYear from 'dayjs/plugin/isLeapYear';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/zh-cn';
import { ValueTransformer } from 'typeorm';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isLeapYear);
dayjs.locale('zh-cn');
dayjs.tz.setDefault('Asia/Shanghai');

export function listToTree(
  arr: any[],
  getId: (item: any) => number,
  getLabel: (item: any) => string,
): any[] {
  const kData: Record<string, any> = {};
  const lData: any[] = [];

  arr.forEach((m) => {
    const id = getId(m);
    const label = getLabel(m);
    const parentId = +m.parentId;
    kData[id] = { id, label, parentId, children: [] };
    if (parentId === 0) {
      lData.push(kData[id]);
    }
  });

  arr.forEach((m) => {
    const id = getId(m);
    const parentId = +m.parentId;
    if (parentId !== 0 && kData[parentId]) {
      kData[parentId].children.push(kData[id]);
    }
  });

  return lData;
}

export function getNowDate(): string {
  return dayjs().format('YYYY-MM-DD HH:mm:ss');
}

export function formatDate(date: Date | string, format = 'YYYY-MM-DD HH:mm:ss'): string {
  return date ? dayjs(date).format(format) : '';
}

export function formatDateTime(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
}

export function deepClone<T>(obj: T): T {
  return lodash.cloneDeep(obj);
}

export function generateUUID(): string {
  return uuidv4().replaceAll('-', '');
}

export function uniq<T extends number | string>(list: T[]): T[] {
  return lodash.uniq(list);
}

export function paginate(
  data: { list: any[]; pageSize: number; pageNum: number },
  filterParam: Record<string, any>,
): any[] {
  if (data.pageSize <= 0 || data.pageNum < 0) return [];

  let arrayData = lodash.toArray(data.list);
  if (Object.keys(filterParam).length > 0) {
    arrayData = lodash.filter(arrayData, (item) => {
      const conditions: boolean[] = [];
      if (filterParam.ipaddr) conditions.push(item.ipaddr?.includes(filterParam.ipaddr));
      if (filterParam.userName && item.userName) conditions.push(item.userName.includes(filterParam.userName));
      return !conditions.includes(false);
    });
  }

  return arrayData.slice(
    (data.pageNum - 1) * data.pageSize,
    data.pageNum * data.pageSize,
  );
}

export { getDataScopeUserIds, applyDataScope } from './data-scope.util';

export function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export function mergeDeep(target: any, ...sources: any[]): any {
  if (!sources.length) return target;
  const source = sources.shift();
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return mergeDeep(target, ...sources);
}

export const dateTransformer: ValueTransformer = {
  to: (value: Date | null): Date | null => (value === null ? null : value),
  from: (value: Date | null): string | null => (value === null ? null : formatDate(value)),
};

export function isEmpty(value: any): boolean {
  return value === null || value === undefined || value === '' || value === 'NaN';
}
