from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import require_agent
from app.config import Settings
from app.db import get_db
from app.dependencies import get_settings
from app.models.agent import AgentIdentity
from app.services.approval_service import ApprovalRequiredError, PolicyDeniedError
from app.services.gateway import GatewayConfigurationError, GatewayExecutionError

from .tools import ToolExecutionError, execute_tool, list_tool_definitions

router = APIRouter()


class McpRequest(BaseModel):
    jsonrpc: str = "2.0"
    id: int | str | None = None
    method: str
    params: dict[str, Any] = Field(default_factory=dict)


def _jsonrpc_result(request_id: int | str | None, result: Any) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": result,
    }


def _jsonrpc_error(
    request_id: int | str | None,
    *,
    code: int,
    message: str,
    data: Any = None,
) -> dict[str, Any]:
    error = {
        "code": code,
        "message": message,
    }
    if data is not None:
        error["data"] = data
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": error,
    }


def _tool_success(payload: Any) -> dict[str, Any]:
    encoded_payload = jsonable_encoder(payload)
    return {
        "isError": False,
        "structuredContent": encoded_payload,
        "content": [
            {
                "type": "text",
                "text": json.dumps(encoded_payload, ensure_ascii=True, sort_keys=True),
            }
        ],
    }


def _tool_error(status_code: int, detail: Any) -> dict[str, Any]:
    payload = jsonable_encoder({
        "status_code": status_code,
        "detail": detail,
    })
    return {
        "isError": True,
        "structuredContent": payload,
        "content": [
            {
                "type": "text",
                "text": json.dumps(payload, ensure_ascii=True, sort_keys=True),
            }
        ],
    }


@router.post("/mcp", tags=["Agent Runtime"], summary="Call MCP tools", description="MCP-compatible JSON-RPC endpoint for agent runtime and knowledge operations.")
def mcp_endpoint(
    payload: McpRequest,
    agent: AgentIdentity = Depends(require_agent),
    session: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    if payload.method == "initialize":
        return _jsonrpc_result(
            payload.id,
            {
                "protocolVersion": "2024-11-05",
                "serverInfo": {
                    "name": "agent-control-plane-mcp",
                    "version": "0.1.0",
                },
                "capabilities": {
                    "tools": {},
                },
            },
        )

    if payload.method == "tools/list":
        return _jsonrpc_result(payload.id, {"tools": list_tool_definitions()})

    if payload.method != "tools/call":
        return _jsonrpc_error(
            payload.id,
            code=-32601,
            message=f"Unsupported MCP method: {payload.method}",
        )

    name = str(payload.params.get("name") or "").strip()
    arguments = payload.params.get("arguments") or {}
    if not name:
        return _jsonrpc_result(payload.id, _tool_error(422, "Tool name is required"))
    if not isinstance(arguments, dict):
        return _jsonrpc_result(payload.id, _tool_error(422, "Tool arguments must be an object"))

    try:
        result = execute_tool(
            name=name,
            arguments=arguments,
            session=session,
            agent=agent,
            settings=settings,
        )
        return _jsonrpc_result(payload.id, _tool_success(result))
    except ToolExecutionError as exc:
        return _jsonrpc_result(payload.id, _tool_error(exc.status_code, exc.detail))
    except ApprovalRequiredError as exc:
        session.commit()
        return _jsonrpc_result(payload.id, _tool_error(409, exc.detail))
    except PolicyDeniedError as exc:
        return _jsonrpc_result(payload.id, _tool_error(403, exc.detail))
    except PermissionError as exc:
        return _jsonrpc_result(payload.id, _tool_error(403, str(exc)))
    except KeyError as exc:
        return _jsonrpc_result(payload.id, _tool_error(404, str(exc)))
    except ValueError as exc:
        return _jsonrpc_result(payload.id, _tool_error(409, str(exc)))
    except GatewayExecutionError as exc:
        return _jsonrpc_result(payload.id, _tool_error(502, str(exc)))
    except GatewayConfigurationError as exc:
        return _jsonrpc_result(payload.id, _tool_error(500, str(exc)))
