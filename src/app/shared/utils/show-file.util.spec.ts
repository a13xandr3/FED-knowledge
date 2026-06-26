import { formatFileSize, hasSnapshotBase64, resolveRenderKind } from './show-file.util';

describe('show-file.util', () => {
  it('formatFileSize deve formatar bytes, kB, MB e arquivo ausente', () => {
    expect(formatFileSize(null)).toBe('');
    expect(formatFileSize(new File(['a'], 'a.txt'))).toBe('1 B');
    expect(formatFileSize(new File([new Uint8Array(2048)], 'a.bin'))).toBe('2.0 kB');
    expect(formatFileSize(new File([new Uint8Array(2 * 1024 * 1024)], 'a.bin'))).toBe('2.00 MB');
  });

  it('hasSnapshotBase64 deve reconhecer payload gzip, identity ou ausente', () => {
    expect(hasSnapshotBase64({ base64Gzip: 'abc' })).toBe(true);
    expect(hasSnapshotBase64({ base64Payload: 'abc' })).toBe(true);
    expect(hasSnapshotBase64({ base64Gzip: '', base64Payload: '' })).toBe(false);
    expect(hasSnapshotBase64(null)).toBe(false);
  });

  it('resolveRenderKind deve classificar por MIME ou extensao', () => {
    expect(resolveRenderKind(new File([''], 'foto.bin', { type: 'image/png' }))).toBe('image');
    expect(resolveRenderKind(new File([''], 'dados.csv'))).toBe('text');
    expect(resolveRenderKind(new File([''], 'dados.json'))).toBe('text');
    expect(resolveRenderKind(new File([''], 'texto.bin', { type: 'text/plain' }))).toBe('text');
    expect(resolveRenderKind(new File([''], 'doc.bin', { type: 'application/pdf' }))).toBe('pdf');
    expect(resolveRenderKind(new File([''], 'doc.pdf'))).toBe('pdf');
    expect(resolveRenderKind(new File([''], 'planilha.bin', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))).toBe('xlsx');
    expect(resolveRenderKind(new File([''], 'planilha.xlsx'))).toBe('xlsx');
    expect(resolveRenderKind(new File([''], 'texto.bin', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))).toBe('docx');
    expect(resolveRenderKind(new File([''], 'texto.docx'))).toBe('docx');
    expect(resolveRenderKind(new File([''], 'arquivo.bin'))).toBe('other');
    expect(resolveRenderKind({ name: '', type: '' } as File)).toBe('other');
  });
});
