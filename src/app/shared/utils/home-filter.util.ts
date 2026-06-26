import { FiltroSelecionado, FiltroTipo } from 'src/app/shared/interfaces/filtro-selecionado.interface';

export type TagValue = { tags?: string[] } | Array<{ tags?: string[] }> | string[] | null | undefined;
export type FileRefsValue = { id: number }[] | number[] | { id: number } | number | null | undefined;

export function parseSelectedFilter(value: string): FiltroSelecionado {
  const [valor, tipo] = value.split('_');
  return { tipo: tipo as FiltroTipo, valor };
}

export function getTagValues(tag: TagValue): string[] {
  if (!tag) {
    return [];
  }

  if (Array.isArray(tag)) {
    if (tag.every((item): item is string => typeof item === 'string')) {
      return tag;
    }

    return tag.flatMap((item) => Array.isArray(item?.tags) ? item.tags : []);
  }

  return Array.isArray(tag.tags) ? tag.tags : [];
}

export function hasTagValues(data: TagValue): boolean {
  return getTagValues(data).length > 0;
}

export function toFileIds(fileRefs: FileRefsValue): number[] {
  return (Array.isArray(fileRefs) ? fileRefs : [fileRefs])
    .filter((item): item is number | { id: number } => item != null)
    .map(item => typeof item === 'number' ? item : item.id);
}
