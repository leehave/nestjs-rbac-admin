import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as Useragent from 'useragent';
import { normalizeClientIp } from '../utils/ip.util';

/** 标记方法为不需要认证 */
export const NotRequireAuth = () => SetMetadata('notRequireAuth', true);

/** 标记方法为不需要权限检查 */
export const SkipPermissionCheck = () => SetMetadata('skipPermissionCheck', true);

/** 重复提交防抖 */
export const RepeatSubmit = (interval = 1000) =>
  SetMetadata('repeatSubmit', interval);

/** 获取客户端信息 */
export const ClientInfo = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const agent = Useragent.parse(request.headers['user-agent']);
  const os = agent.os.toJSON().family;
  const browser = agent.toAgent();

  return {
    userAgent: request.headers['user-agent'],
    ipaddr: normalizeClientIp(request.ip),
    browser,
    os,
    loginLocation: '',
    dateTime: new Date().toISOString(),
    userName: request.user?.userName || request.user?.user?.username || '',
  };
});

export type ClientInfoDto = {
  userAgent: string;
  ipaddr: string;
  browser: string;
  os: string;
  loginLocation: string;
  dateTime: string;
  userName?: string;
};
