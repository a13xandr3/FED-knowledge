import { ProcessedSnapshot } from "../components/input-file/file-utils";

export interface IFileRef {
  id: number;
  filename: string;
}

export interface IFilesPayload {
  files: IFileRef[];
}

export interface ShowFileData {
  snapshot?: ProcessedSnapshot;
  itemId?: string | number; // opcional: exibir no header
}