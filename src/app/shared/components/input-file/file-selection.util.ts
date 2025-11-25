export type FileRef = { id: number; filename: string };
export type FilesPayload = { files: FileRef[] };

export type PreviewItem = {
  id?: number;                 // id do arquivo no backend (p/ os já salvos)
  url: string;                 // object URL para preview
  filename: string;
  mimeType?: string;
  sizeBytes: number;
};

/** Extrai IDs válidos de uma lista de previews (ordem preservada). */
export function extractIds(previews: PreviewItem[]): number[] {
  return previews
    .map(p => (Number.isFinite(p.id) ? Number(p.id) : NaN))
    .filter(Number.isFinite) as number[];
}

/** Mapa id -> filename a partir dos previews (usado p/ montar payload sem depender de índice). */
export function idToFilename(previews: PreviewItem[]): Map<number, string> {
  const out = new Map<number, string>();
  for (const p of previews) {
    if (Number.isFinite(p.id)) out.set(Number(p.id), p.filename);
  }
  return out;
}

/** Diferença de IDs: o que havia em `prev` e não está em `curr`. */
export function diffRemovedIds(prev: number[], curr: number[]): number[] {
  const keep = new Set(curr);
  return prev.filter(id => !keep.has(id));
}

/** Upsert (inclusão/atualização) imutável. Deduplica por id. */
export function upsertFileRef(list: FileRef[], ref: FileRef): FileRef[] {
  const byId = new Map<number, FileRef>(list.map(r => [r.id, r]));
  byId.set(ref.id, { id: ref.id, filename: String(ref.filename) });
  return Array.from(byId.values());
}

/** Remove por id (imutável). */
export function removeById(list: FileRef[], id: number): FileRef[] {
  return list.filter(r => r.id !== id);
}

/** Mescla anexos existentes (IDs atuais) com novos (já salvos via upload). */
export function mergeExistingAndNew(
  existingIds: number[],
  idNameMap: Map<number, string>,
  newRefs: FileRef[],
): FilesPayload {
  const m = new Map<number, FileRef>();
  // existentes (id -> filename vindo do preview; fallback estável)
  for (const id of existingIds) {
    if (id <= 0) continue;  // <- Correção: pula IDs inválidos (ex.: 0 ou negativos)
    m.set(id, { id, filename: idNameMap.get(id) ?? `file-${id}` });
  }
  // novos (resposta do upload)
  for (const r of newRefs) {
    m.set(r.id, { id: r.id, filename: r.filename ?? `file-${r.id}` });
  }
  return { files: Array.from(m.values()) };
}
