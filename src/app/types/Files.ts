import { IFileRef } from "src/app/shared/interfaces/interface.file-ref";

export type FilesPayload = { fileRefs: IFileRef[] };

export type PreviewItem = { 
    id?: number; 
    url: string; 
    filename: string; 
    mimeType?: string; 
    sizeBytes: number; 
};

export type RenderKind = 'image' | 'text' | 'pdf' | 'docx' | 'xlsx' | 'other';

/** Níveis válidos para zlib/pako */
export type ZlibLevel = -1|0|1|2|3|4|5|6|7|8|9;