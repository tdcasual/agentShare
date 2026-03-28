import type { LocalizedCopy, ResourceKind } from "./types";

export type IntakeCatalogFieldOption = {
  value: string;
  label: LocalizedCopy;
};

export type IntakeCatalogField = {
  key: string;
  control: string;
  label: LocalizedCopy;
  description?: LocalizedCopy;
  placeholder?: LocalizedCopy;
  default_value?: string | boolean | null;
  required?: boolean;
  advanced?: boolean;
  read_only?: boolean;
  options?: IntakeCatalogFieldOption[];
  options_source?: string;
};

export type IntakeCatalogSection = {
  id: string;
  title: LocalizedCopy;
  description?: LocalizedCopy;
  fields: IntakeCatalogField[];
};

export type IntakeCatalogVariant = {
  resource_kind: ResourceKind;
  variant: string;
  title: LocalizedCopy;
  summary: LocalizedCopy;
  sections: IntakeCatalogSection[];
};

export type IntakeCatalogResource = {
  kind: ResourceKind;
  default_variant: string;
  variants: IntakeCatalogVariant[];
};

export type IntakeCatalogResponse = {
  resource_kinds: IntakeCatalogResource[];
};
