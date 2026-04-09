/**
 * Deprecated helper to keep backwards compatibility with older DTO references.
 *
 * Most of the authoritative task/agent/run types now live in `./types.ts`.
 * This file simply re-exports those definitions so legacy imports continue to work.
 */

export type RunTransportDTO = import('./types').RunTransport;
export type Run = import('./types').Run;
export type TokenFeedbackTransportDTO = import('./types').TokenFeedbackTransport;
export type TokenFeedback = import('./types').TokenFeedback;
export type AgentTokenTransportDTO = import('./types').AgentTokenTransport;
export type AgentToken = import('./types').AgentToken;
export type TaskTargetView = import('./types').TaskTargetView;
