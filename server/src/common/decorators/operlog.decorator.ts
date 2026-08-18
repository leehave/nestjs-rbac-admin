import { SetMetadata } from '@nestjs/common';

export type OperlogConfig =
  | Partial<{
      businessType?: number | string;
    }>
  | undefined;

/**
 * @Operlog — 操作日志装饰器。
 * 支持 server 对象写法 @Operlog({ businessType }) 与标题写法 @Operlog('标题', '2')。
 */
export const Operlog = (titleOrConfig?: string | OperlogConfig, businessType?: string) => {
  if (typeof titleOrConfig !== 'string') {
    return SetMetadata('operlog', titleOrConfig);
  }
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata('operlogTitle', titleOrConfig)(target, propertyKey, descriptor);
    if (businessType) {
      SetMetadata('operlogBusinessType', businessType)(target, propertyKey, descriptor);
    }
  };
};
