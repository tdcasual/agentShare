type SearchParamReader = {
  get(name: string): string | null;
};

export type FocusedEntry = {
  taskId?: string;
  resourceKind?: string;
  resourceId?: string;
  agentId?: string;
  dreamRunId?: string;
  adminId?: string;
  eventId?: string;
};

function readParam(reader: SearchParamReader, key: string) {
  const value = reader.get(key);
  return value && value.length > 0 ? value : undefined;
}

export function readFocusedEntry(reader: SearchParamReader): FocusedEntry {
  return {
    taskId: readParam(reader, 'taskId'),
    resourceKind: readParam(reader, 'resourceKind'),
    resourceId: readParam(reader, 'resourceId'),
    agentId: readParam(reader, 'agentId'),
    dreamRunId: readParam(reader, 'dreamRunId'),
    adminId: readParam(reader, 'adminId'),
    eventId: readParam(reader, 'eventId'),
  };
}
