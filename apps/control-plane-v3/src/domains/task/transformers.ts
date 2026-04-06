/**
 * Task Domain Transformers - Task领域DTO转换器
 *
 * 提供Run, TokenFeedback, AgentToken的DTO转换
 */

import { BaseTransformer, timestampToDate, dateToTimestamp } from '@/lib/dto-transformer';
import type {
  // Run types
  RunTransportDTO,
  Run,
  // TokenFeedback types
  TokenFeedbackTransportDTO,
  TokenFeedback,
  // AgentToken types
  AgentTokenTransportDTO,
  AgentToken,
} from './types-new';

// ============================================
// Run Transformer
// ============================================

export class RunTransformer extends BaseTransformer<RunTransportDTO, Run> {
  toModel(dto: RunTransportDTO): Run {
    return {
      runId: dto.run_id,
      taskId: dto.task_id,
      agentId: dto.agent_id,
      tokenId: dto.token_id,
      taskTargetId: dto.task_target_id,
      status: dto.status,
      resultSummary: dto.result_summary,
      outputPayload: dto.output_payload,
      errorSummary: dto.error_summary,
      capabilityInvocations: dto.capability_invocations ?? [],
      leaseEvents: dto.lease_events ?? [],
      createdAt: timestampToDate(dto.created_at)!,
      updatedAt: timestampToDate(dto.updated_at)!,
    };
  }

  toDTO(model: Run): RunTransportDTO {
    return {
      run_id: model.runId,
      task_id: model.taskId,
      agent_id: model.agentId,
      token_id: model.tokenId,
      task_target_id: model.taskTargetId,
      status: model.status,
      result_summary: model.resultSummary,
      output_payload: model.outputPayload,
      error_summary: model.errorSummary,
      capability_invocations: model.capabilityInvocations,
      lease_events: model.leaseEvents,
      created_at: dateToTimestamp(model.createdAt)!,
      updated_at: dateToTimestamp(model.updatedAt)!,
    };
  }
}

export const runTransformer = new RunTransformer();

// ============================================
// TokenFeedback Transformer
// ============================================

export class TokenFeedbackTransformer extends BaseTransformer<
  TokenFeedbackTransportDTO,
  TokenFeedback
> {
  toModel(dto: TokenFeedbackTransportDTO): TokenFeedback {
    return {
      tokenId: dto.token_id,
      taskTargetId: dto.task_target_id,
      runId: dto.run_id,
      score: dto.score,
      verdict: dto.verdict,
      summary: dto.summary,
      createdByActorType: dto.created_by_actor_type,
      createdByActorId: dto.created_by_actor_id,
      createdAt: timestampToDate(dto.created_at)!,
    };
  }

  toDTO(model: TokenFeedback): TokenFeedbackTransportDTO {
    return {
      token_id: model.tokenId,
      task_target_id: model.taskTargetId,
      run_id: model.runId,
      score: model.score,
      verdict: model.verdict,
      summary: model.summary,
      created_by_actor_type: model.createdByActorType,
      created_by_actor_id: model.createdByActorId,
      created_at: dateToTimestamp(model.createdAt)!,
    };
  }
}

export const tokenFeedbackTransformer = new TokenFeedbackTransformer();

// ============================================
// AgentToken Transformer
// ============================================

export class AgentTokenTransformer extends BaseTransformer<AgentTokenTransportDTO, AgentToken> {
  toModel(dto: AgentTokenTransportDTO): AgentToken {
    return {
      tokenId: dto.token_id,
      agentId: dto.agent_id,
      displayName: dto.display_name,
      tokenPrefix: dto.token_prefix,
      trustScore: dto.trust_score,
      riskTier: dto.risk_tier,
      authMethod: dto.auth_method,
      status: dto.status,
      scopes: dto.scopes ?? [],
      labels: dto.labels ?? {},
      expiresAt: timestampToDate(dto.expires_at),
      lastUsedAt: timestampToDate(dto.last_used_at),
      lastFeedbackAt: timestampToDate(dto.last_feedback_at),
      successRate: dto.success_rate,
      completedRuns: dto.completed_runs,
      successfulRuns: dto.successful_runs,
      issuedByActorId: dto.issued_by_actor_id,
      createdAt: timestampToDate(dto.created_at)!,
    };
  }

  toDTO(model: AgentToken): AgentTokenTransportDTO {
    return {
      token_id: model.tokenId,
      agent_id: model.agentId,
      display_name: model.displayName,
      token_prefix: model.tokenPrefix,
      trust_score: model.trustScore,
      risk_tier: model.riskTier,
      auth_method: model.authMethod,
      status: model.status,
      scopes: model.scopes,
      labels: model.labels,
      expires_at: dateToTimestamp(model.expiresAt),
      last_used_at: dateToTimestamp(model.lastUsedAt),
      last_feedback_at: dateToTimestamp(model.lastFeedbackAt),
      success_rate: model.successRate,
      completed_runs: model.completedRuns,
      successful_runs: model.successfulRuns,
      issued_by_actor_id: model.issuedByActorId,
      created_at: dateToTimestamp(model.createdAt)!,
    };
  }
}

export const agentTokenTransformer = new AgentTokenTransformer();
