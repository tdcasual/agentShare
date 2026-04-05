/**
 * Playbook Domain Types - 手册领域类型
 * 
 * 与后端 /api/playbooks 对齐
 * 后端返回: id, title, task_type, body, tags, publication_status
 */

// ============================================
// Transport DTO (后端原始结构)
// ============================================

export interface PlaybookTransportDTO {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly task_type: string;
  readonly tags: string[];
  readonly publication_status: string;
}

// ============================================
// Domain Model (前端使用)
// ============================================

export interface Playbook {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly taskType: string;
  readonly tags: string[];
  readonly publicationStatus: string;
}

// ============================================
// 查询参数
// ============================================

export interface PlaybookSearchQuery {
  readonly q?: string;
  readonly taskType?: string;
  readonly tag?: string;
  readonly limit?: number;
  readonly offset?: number;
}

// ============================================
// 搜索响应
// ============================================

export interface PlaybookSearchResponse {
  readonly items: PlaybookTransportDTO[];
  readonly meta: {
    readonly total: number;
    readonly items_count: number;
    readonly applied_filters: {
      readonly task_type?: string;
      readonly q?: string;
      readonly tag?: string;
    };
  };
}

// ============================================
// 创建输入
// ============================================

export interface CreatePlaybookInput {
  readonly title: string;
  readonly body: string;
  readonly taskType: string;
  readonly tags?: string[];
}
