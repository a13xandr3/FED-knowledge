export interface FileRef {
  id: number;
  filename: string;
}
export interface FilesPayload {
  files: FileRef[];
}
