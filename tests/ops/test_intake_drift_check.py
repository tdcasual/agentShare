from __future__ import annotations

import importlib.util
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[2] / "scripts" / "check-intake-drift.py"
SPEC = importlib.util.spec_from_file_location("check_intake_drift", SCRIPT_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def test_compare_contract_summaries_flags_default_variant_drift():
    backend = {
        "secret": {
            "default_variant": "generic_secret",
            "variants": {},
        }
    }
    frontend = {
        "secret": {
            "default_variant": "openai_api_token",
            "variants": {},
        }
    }

    failures = MODULE.compare_contract_summaries(backend, frontend)

    assert failures == [
        "secret default variant drifted: backend='generic_secret' frontend='openai_api_token'"
    ]


def test_compare_contract_summaries_flags_field_semantic_drift():
    backend = {
        "capability": {
            "default_variant": "generic_capability",
            "variants": {
                "generic_capability": {
                    "title": {"en": "Generic capability", "zh": "通用能力"},
                    "summary": {"en": "Backend summary", "zh": "后端摘要"},
                    "sections": [
                        {
                            "id": "basic",
                            "title": {"en": "Basic fields", "zh": "基础字段"},
                            "fields": [
                                {
                                    "key": "secret_id",
                                    "control": "select",
                                    "required": True,
                                    "advanced": False,
                                    "read_only": False,
                                    "default_value": None,
                                    "options_source": "management_secret_inventory",
                                    "option_values": [],
                                }
                            ],
                        }
                    ],
                }
            },
        }
    }
    frontend = {
        "capability": {
            "default_variant": "generic_capability",
            "variants": {
                "generic_capability": {
                    "title": {"en": "Generic capability", "zh": "通用能力"},
                    "summary": {"en": "Backend summary", "zh": "后端摘要"},
                    "sections": [
                        {
                            "id": "basic",
                            "title": {"en": "Basic fields", "zh": "基础字段"},
                            "fields": [
                                {
                                    "key": "secret_id",
                                    "control": "select",
                                    "required": True,
                                    "advanced": False,
                                    "read_only": False,
                                    "default_value": None,
                                    "options_source": None,
                                    "option_values": [],
                                }
                            ],
                        }
                    ],
                }
            },
        }
    }

    failures = MODULE.compare_contract_summaries(backend, frontend)

    assert failures == [
        "capability variant 'generic_capability' drifted between backend and frontend contract summaries"
    ]
