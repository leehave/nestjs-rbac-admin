/**
 * 从函数参数中提取格式化键值。
 * 例如：formatKey = "user:{id}"，args = [{id: 1}] → "user:1"
 */
export function paramsKeyFormat(
  func: (...args: any[]) => any,
  formatKey: string,
  args: any[],
): string | null {
  const originMethodArgs = getArgs(func);
  const paramsMap: Record<string, any> = {};

  originMethodArgs?.forEach((arg, index) => {
    paramsMap[arg] = args[index];
  });

  let isNotGet = false;
  const key = stringFormat(formatKey, (key) => {
    const str = getNestedValue(paramsMap, key);
    if (str === undefined || str === null) isNotGet = true;
    return String(str);
  });

  if (isNotGet) return null;
  return key;
}

/** 从对象中按点路径取值，如 get({a:{b:1}}, 'a.b') → 1 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current?.[key];
  }, obj);
}

function getArgs(func: (...args: any[]) => any): string[] {
  const fnStr = func.toString();
  const params = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'));
  return params
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function stringFormat(str: string, callback: (key: string) => string): string {
  return str.replace(/\{([^}]+)\}/g, (_word, key: string) => callback(key));
}
