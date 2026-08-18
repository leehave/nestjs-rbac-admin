import lodash from 'lodash';

function getArgs(func: (...args: any[]) => any): string[] {
  const funcString = func.toString();
  const params = funcString.slice(funcString.indexOf('(') + 1, funcString.indexOf(')'));
  return params.match(/([^\s,]+)/g) ?? [];
}

const stringFormat = (str: string, callback: (key: string) => string): string => {
  return str.replace(/\{([^}]+)\}/g, (_word, key) => callback(key));
};

export function paramsKeyFormat(func: (...args: any[]) => any, formatKey: string, args: any[]): string | null {
  const originMethodArgs = getArgs(func);
  const paramsMap: Record<string, any> = {};
  originMethodArgs?.forEach((arg, index) => {
    paramsMap[arg] = args[index];
  });

  let isNotGet = false;
  const key = stringFormat(formatKey, (key) => {
    const str = lodash.get(paramsMap, key);
    if (!str) isNotGet = true;
    return str;
  });

  if (isNotGet) return null;
  return key;
}

export function paramsKeyGetObj(func: (...args: any[]) => any, formatKey: string | undefined, args: any[]): any {
  const originMethodArgs = getArgs(func);
  const paramsMap: Record<string, any> = {};
  originMethodArgs?.forEach((arg, index) => {
    paramsMap[arg] = args[index];
  });

  const obj = lodash.get(paramsMap, formatKey ?? '');
  if (typeof obj === 'object') return obj;
  if (args[0] && typeof args[0] === 'object') return args[0];
  return null;
}
