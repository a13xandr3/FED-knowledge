import { RenderKind } from 'src/app/types/Files';

type SnapshotWithPayload = {
  base64Gzip?: unknown;
  base64Payload?: unknown;
};

type FileMetadata = Pick<File, 'name' | 'type'>;

export function formatFileSize(file?: File | null): string {
  if (!file) return '';

  const bytes = file.size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function hasSnapshotBase64(snapshot: unknown): boolean {
  const payload = snapshot as SnapshotWithPayload | null | undefined;
  return !!(payload?.base64Gzip || payload?.base64Payload);
}

export function resolveRenderKind(file: FileMetadata): RenderKind {
  const mimeType = (file.type || '').toLowerCase();
  const filename = (file.name || '').toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/') || filename.endsWith('.csv') || filename.endsWith('.json')) return 'text';
  if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) return 'pdf';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || filename.endsWith('.xlsx')) return 'xlsx';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filename.endsWith('.docx')) return 'docx';

  return 'other';
}
