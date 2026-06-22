export function normalizeChipValue(value: unknown): string[] {
  if (!value && value !== 0) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(itemToChipString).filter(Boolean);
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record['tags'])) return record['tags'].map(itemToChipString).filter(Boolean);
    if (Array.isArray(record['uris'])) return record['uris'].map(itemToChipString).filter(Boolean);
    if (record['value']) return [String(record['value'])];
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const normalized = String(value).trim();
    return normalized ? [normalized] : [];
  }

  return [];
}

function itemToChipString(item: unknown): string {
  if (typeof item === 'string') return item;
  if (typeof item === 'number') return String(item);
  if (item == null) return '';

  if (typeof item === 'object') {
    const record = item as Record<string, unknown>;
    if (record['value']) return String(record['value']);
    if (record['tag']) return String(record['tag']);
    if (record['uri']) return String(record['uri']);

    try {
      return JSON.stringify(item);
    } catch {
      return '';
    }
  }

  return '';
}
