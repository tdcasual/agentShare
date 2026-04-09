# Agent Server First

This document is the source of truth for how to read the current project architecture.

## Core Position

The project should be understood as **agent server first**, not `token first`.

That means:

- the primary product is an agent-facing server surface
- runtime behavior is organized around agent workspace, session, tool access, policy, and governed task execution
- tokens are credentials for remote access, not the conceptual center of the system

## What The Server Actually Is

The server is responsible for:

- agent runtime identity
- task queue and task execution records
- governed capability access
- playbook search and reusable knowledge
- review and approval workflow
- operator-facing management and audit surfaces
- OpenClaw-style session, dream mode, and memory endpoints
- MCP exposure for tool-driven agent access

In other words, this project is not just a database of tokens with a UI around it.
It is an **agent server** that also happens to issue and govern remote credentials when needed.

## Runtime Access Model

There are two runtime access paths:

### 1. In-project agent server sessions

This is the primary runtime model.

- management creates an OpenClaw-compatible agent record
- the agent gets one or more `session_key` credentials
- runtime access uses the session key as the bearer credential
- session-bound behavior covers work execution, MCP access, dream mode, and explicit memory

This path is the default mental model for the project.

### 2. Remote agent credentials

This is the compatibility and remote-connectivity model.

- management creates a remote agent profile
- the server can mint one or more managed remote-access tokens for that remote runtime
- those tokens let an external machine, external agent host, or off-project runtime call the same governed server surfaces

Important: the token is only the **credential**.
The server-side business model is still agent execution, policy, review, audit, and task flow.

## Why Tokens Are Not The Center

A token is:

- revocable
- replaceable
- scoped to remote access
- useful for attribution and trust scoring

But a token is not:

- the canonical product abstraction
- the main operator mental model
- the best way to explain the architecture

If a reader leaves the docs thinking this project is mainly “for issuing tokens to agents,” the docs are drifting.

The correct framing is:

> This project is an agent server with governed runtime surfaces. Tokens are one way for remote runtimes to reach that server.

## Documentation Reading Order

If you are new to the project, read in this order:

1. `README.md`
2. `docs/guides/agent-server-first.md`
3. `docs/guides/agent-quickstart.md`
4. `docs/guides/mcp-quickstart.md`
5. `docs/guides/admin-bootstrap-and-token-ops.md`

Historical design and migration plans under `docs/plans/` may still describe earlier token-centric or migration-era thinking. Treat them as change history unless they are explicitly linked from the current guides as the active source of truth.

## Documentation Rules Going Forward

When updating docs:

- explain OpenClaw-style session-backed runtime first
- describe remote tokens as a secondary access path for external runtimes
- avoid describing tokens as the primary architecture
- keep management, review, approval, MCP, dream mode, and workspace semantics attached to the server model

## Short Form Summary

Use this summary when you need one paragraph:

> AgentShare is an agent server first. It exposes governed runtime surfaces for tasks, capabilities, playbooks, reviews, MCP, and OpenClaw-style sessions. Session-backed in-project agents are the primary runtime path. Managed tokens exist for remote or off-project runtimes that need to reach the same server safely.
