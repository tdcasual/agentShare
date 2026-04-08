# Dream Mode Quickstart

Dream Mode is the control plane's bounded autonomy surface for in-project OpenClaw runtimes.

It lets one authenticated OpenClaw session:

- start an explicit dream run with a visible objective
- record plan / reflect / propose-task steps
- persist explicit memory notes
- create bounded follow-up task proposals when policy allows

It does **not** create a hidden background daemon, persist hidden chain-of-thought, or bypass approval policy.

## Preconditions

- a management session cookie for provisioning the agent
- an OpenClaw agent with `dream_policy.enabled = true`
- one OpenClaw `session_key`

## 1. Provision An Agent With Dream Mode Enabled

```bash
curl -sS \
  -b "$ACP_COOKIE_JAR" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"dream-runtime",
    "workspace_root":"/srv/openclaw/dream-runtime",
    "agent_dir":".openclaw/agents/dream-runtime",
    "allowed_task_types":["config_sync","prompt_run"],
    "dream_policy":{
      "enabled":true,
      "max_steps_per_run":4,
      "max_followup_tasks":1,
      "allow_task_proposal":true,
      "allow_memory_write":true,
      "max_context_tokens":4096
    }
  }' \
  "$ACP_BASE_URL/api/openclaw/agents"
```

## 2. Start A Dream Run

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d '{"objective":"Inspect config drift and propose the next safe task"}' \
  "$ACP_BASE_URL/api/openclaw/dream-runs"
```

Save the returned id as `DREAM_RUN_ID`.

## 3. Record Steps

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "step_type":"plan",
    "status":"completed",
    "input_payload":{"prompt":"What should I do next?"},
    "output_payload":{"summary":"Search playbooks and inspect current task queue"},
    "token_usage":{"input":10,"output":6}
  }' \
  "$ACP_BASE_URL/api/openclaw/dream-runs/$DREAM_RUN_ID/steps"
```

When the run hits its configured budget, the response will stop the run with `stop_reason="budget_exhausted"`.

## 4. Persist Explicit Memory

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "scope":"agent",
    "kind":"working_note",
    "importance":"medium",
    "tags":["config","drift"],
    "content":"Drift usually begins in the staging overlay."
  }' \
  "$ACP_BASE_URL/api/openclaw/memory"
```

Search it later:

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  "$ACP_BASE_URL/api/openclaw/memory?scope=agent&tag=config&q=overlay"
```

## 5. Propose One Follow-Up Task Through MCP

```bash
curl -sS \
  -H "Authorization: Bearer $ACP_SESSION_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"jsonrpc\":\"2.0\",
    \"id\":1,
    \"method\":\"tools/call\",
    \"params\":{
      \"name\":\"dream.tasks.propose_followup\",
      \"arguments\":{
        \"run_id\":\"$DREAM_RUN_ID\",
        \"title\":\"Investigate config drift\",
        \"task_type\":\"config_sync\",
        \"input\":{\"source\":\"dream\"}
      }
    }
  }" \
  "$ACP_BASE_URL/mcp"
```

If the run already used its follow-up budget, MCP returns a structured `409` error.

## Stop Reasons To Expect

- `budget_exhausted`
- `manual_stop`
- `approval_required`
- `task_proposal_disallowed`

## Operator Guidance

- Keep Dream Mode disabled by default and enable it per agent.
- Start with low step budgets and zero follow-up tasks.
- Treat explicit memory notes as operator-visible artifacts.
- Use the management console `/identities` page to inspect dream policy and recent dream runs.
