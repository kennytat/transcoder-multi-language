import { IEnvironment } from '@vgm-converter/xplat/core';
import { deepMerge } from '@vgm-converter/xplat/utils';
import { environmentBase } from './environment.base';

export const environmentProd = deepMerge(environmentBase, <IEnvironment>{
  production: true,
  // customizations here...
});
