from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class LocalizedText(BaseModel):
    en: str
    zh: str


class IntakeFieldOptionCatalog(BaseModel):
    value: str
    label: LocalizedText


class IntakeFieldCatalog(BaseModel):
    key: str
    control: str
    label: LocalizedText
    description: LocalizedText | None = None
    placeholder: LocalizedText | None = None
    default_value: str | bool | None = None
    required: bool = False
    advanced: bool = False
    read_only: bool = False
    options: list[IntakeFieldOptionCatalog] = Field(default_factory=list)
    options_source: str | None = None


class IntakeSectionCatalog(BaseModel):
    id: str
    title: LocalizedText
    description: LocalizedText | None = None
    fields: list[IntakeFieldCatalog]


class IntakeVariantCatalog(BaseModel):
    resource_kind: str
    variant: str
    title: LocalizedText
    summary: LocalizedText
    sections: list[IntakeSectionCatalog]


class IntakeResourceCatalog(BaseModel):
    kind: str
    default_variant: str
    variants: list[IntakeVariantCatalog]


class IntakeCatalogResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "resource_kinds": [
                    {
                        "kind": "secret",
                        "default_variant": "generic_secret",
                        "variants": [
                            {
                                "resource_kind": "secret",
                                "variant": "openai_api_token",
                                "title": {"en": "OpenAI API token", "zh": "OpenAI API token"},
                                "summary": {
                                    "en": "Preset for OpenAI token intake with guided scopes.",
                                    "zh": "为 OpenAI token 提供带默认范围的录入模板。",
                                },
                                "sections": [
                                    {
                                        "id": "basic",
                                        "title": {"en": "Basic fields", "zh": "基础字段"},
                                        "fields": [
                                            {
                                                "key": "provider",
                                                "control": "text",
                                                "label": {"en": "Provider", "zh": "服务提供方"},
                                                "default_value": "openai",
                                                "read_only": True,
                                            }
                                        ],
                                    }
                                ],
                            }
                        ],
                    }
                ]
            }
        }
    )

    resource_kinds: list[IntakeResourceCatalog]
