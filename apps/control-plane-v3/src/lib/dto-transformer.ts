/**
 * DTO Transformer - DTO转换架构
 *
 * 提供Transport DTO和Domain Model之间的转换
 * 支持延迟转换和缓存机制
 */

import { logger } from './logger';

// ============================================
// 基础类型定义
// ============================================

export type TransportDTO = Record<string, unknown>;

export type DomainModel = Record<string, unknown>;

export interface DTOTransformer<TDTO extends TransportDTO, TModel extends DomainModel> {
  /** DTO转换为Model */
  toModel(dto: TDTO): TModel;
  /** Model转换为DTO */
  toDTO(model: TModel): TDTO;
  /** DTO列表转换为Model列表 */
  toModelList(dtos: TDTO[]): TModel[];
}

// ============================================
// 缓存机制
// ============================================

interface TransformCache<TDTO, TModel> {
  get(dto: TDTO): TModel | undefined;
  set(dto: TDTO, model: TModel): void;
  clear(): void;
}

/**
 * 创建转换缓存
 * @param keyFn 从DTO生成缓存key的函数
 */
export function createTransformCache<TDTO, TModel>(
  keyFn: (dto: TDTO) => string
): TransformCache<TDTO, TModel> {
  const cache = new Map<string, TModel>();

  return {
    get: (dto) => cache.get(keyFn(dto)),
    set: (dto, model) => cache.set(keyFn(dto), model),
    clear: () => cache.clear(),
  };
}

// ============================================
// 命名转换工具
// ============================================

/**
 * snake_case 转 camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * camelCase 转 snake_case
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * 批量转换对象key
 */
export function transformKeys<T extends Record<string, unknown>>(
  obj: T,
  transform: (key: string) => string
): Record<string, unknown> {
  return Object.entries(obj).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[transform(key)] = value;
    return acc;
  }, {});
}

// ============================================
// 时间戳转换
// ============================================

/**
 * 后端时间戳（秒）转Date对象
 */
export function timestampToDate(timestamp: number | undefined): Date | undefined {
  if (timestamp === undefined) {
    return undefined;
  }
  return new Date(timestamp * 1000);
}

/**
 * Date对象转后端时间戳（秒）
 */
export function dateToTimestamp(date: Date | undefined): number | undefined {
  if (date === undefined) {
    return undefined;
  }
  return Math.floor(date.getTime() / 1000);
}

// ============================================
// 基础转换器类
// ============================================

export abstract class BaseTransformer<
  TDTO extends TransportDTO,
  TModel extends DomainModel,
> implements DTOTransformer<TDTO, TModel> {
  abstract toModel(dto: TDTO): TModel;
  abstract toDTO(model: TModel): TDTO;

  toModelList(dtos: TDTO[]): TModel[] {
    return dtos.map((dto) => this.toModel(dto));
  }

  toDTOList(models: TModel[]): TDTO[] {
    return models.map((model) => this.toDTO(model));
  }
}

// ============================================
// 带缓存的转换器
// ============================================

export abstract class CachedTransformer<
  TDTO extends TransportDTO & { id?: string },
  TModel extends DomainModel & { id?: string },
> extends BaseTransformer<TDTO, TModel> {
  private cache = createTransformCache<TDTO, TModel>((dto) => dto.id || JSON.stringify(dto));

  toModel(dto: TDTO): TModel {
    // 检查缓存
    const cached = this.cache.get(dto);
    if (cached) {
      return cached;
    }

    // 执行转换
    const model = this.transformToModel(dto);

    // 存入缓存
    this.cache.set(dto, model);
    return model;
  }

  abstract transformToModel(dto: TDTO): TModel;

  clearCache(): void {
    this.cache.clear();
  }
}

// ============================================
// 转换错误处理
// ============================================

export class TransformError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly field?: string
  ) {
    super(`[TransformError] ${message}`);
    this.name = 'TransformError';
  }
}

/**
 * 安全转换包装器
 */
export function safeTransform<T>(transform: () => T, errorMessage: string): T | null {
  try {
    return transform();
  } catch (error) {
    logger.error.error(errorMessage, error);
    return null;
  }
}
