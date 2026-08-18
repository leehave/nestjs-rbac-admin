import xss from 'xss';

/**
 * 递归清洗对象所有字符串字段，防御XSS
 * @param data 任意请求数据：body/query/params
 * @returns 清洗后数据
 */
export function deepXssSanitize<T>(data: T): T {
  if (typeof data === 'string') {
    return xss(data) as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => deepXssSanitize(item)) as unknown as T;
  }
  if (data && typeof data === 'object' && data !== null) {
    const result = {} as Record<string, any>;
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = deepXssSanitize(data[key]);
      }
    }
    return result as T;
  }
  return data;
}