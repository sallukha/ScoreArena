type AnyRecord = Record<string, any>;

export function isServerTimestamp(value: any) {
  return value && typeof value === 'object' && value.__type === 'serverTimestamp';
}

export function isIncrement(value: any) {
  return value && typeof value === 'object' && value.__type === 'increment';
}

function setDeep(target: AnyRecord, path: string, value: any) {
  const parts = path.split('.');
  let cursor: AnyRecord = target;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }

  cursor[parts[parts.length - 1]] = value;
}

function getDeep(target: AnyRecord, path: string) {
  return path.split('.').reduce<any>((acc, part) => (acc == null ? undefined : acc[part]), target);
}

export function normalizePayload(input: any): any {
  if (Array.isArray(input)) return input.map(normalizePayload);
  if (!input || typeof input !== 'object') return input;
  if (isServerTimestamp(input)) return new Date();
  if (isIncrement(input)) return input;

  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, normalizePayload(value)])
  );
}

export function applyPatchedUpdate(target: AnyRecord, patch: AnyRecord) {
  const normalized = normalizePayload(patch);

  for (const [key, value] of Object.entries(normalized)) {
    if (isIncrement(value)) {
      const current = Number(getDeep(target, key) ?? 0);
      setDeep(target, key, current + Number((value as any).amount || 0));
      continue;
    }

    setDeep(target, key, value);
  }

  return target;
}
