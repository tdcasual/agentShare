/**
 * Domains 统一导出
 *
 * 提供：
 * - 所有 Domain 类型
 * - 所有 Domain API
 * - 所有 Domain Hooks
 */


import { identityApi } from './identity';
import { taskApi } from './task';
import { governanceApi } from './governance';
import { reviewApi } from './review';
import { eventApi } from './event';
import { searchApi } from './search';
import { catalogApi } from './catalog';
import { approvalApi } from './approval';
import { playbookApi } from './playbook';


export {
  identityApi,
  taskApi,
  governanceApi,
  reviewApi,
  eventApi,
  searchApi,
  catalogApi,
  approvalApi,
  playbookApi,
};


export * from './identity';


export * from './task';


export * from './governance';


export * from './review';


export * from './event';


export * from './search';


export * from './catalog';


export * from './approval';


export * from './playbook';
