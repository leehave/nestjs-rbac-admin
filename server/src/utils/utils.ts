import { utils as crossEnvUtils } from 'cross-env-plugins';

export const utils = {
  ...crossEnvUtils,
};

export type AppUtils = typeof utils;
