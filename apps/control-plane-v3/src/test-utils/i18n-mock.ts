import messages from '@/i18n/messages/en.json';

type MessageValue = string | number;

function getMessageValue(source: unknown, key: string): string | null {
  return key.split('.').reduce<unknown>((current, segment) => {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[segment];
    }
    return null;
  }, source) as string | null;
}

export function translateMessage(key: string, values?: Record<string, MessageValue>) {
  const template = getMessageValue(messages, key);
  if (typeof template !== 'string') {
    return key;
  }

  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? `{${name}}`));
}
