export interface FileRef {
  id: number;
  filename: string;
}
/*
export interface _PreviewItem {
  url: string;
  filename: string;
  mimeType?: string | null;
  id?: string | number;
}
*/
export interface FilesPayload {
  files: FileRef[];
}