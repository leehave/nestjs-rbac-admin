/**
 * 标记路由无需登录（JwtAuthGuard 放行）。
 */
import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constant/index';

export const Public = (isPublic = true) => SetMetadata(IS_PUBLIC_KEY, isPublic);