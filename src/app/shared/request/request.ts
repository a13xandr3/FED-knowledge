export interface ILinkRequest {
    id: number;
    name: string;
    uri: any;
    categoria: string;
    subCategoria: string;
    descricao: string;
    tag: any;
    fileID?: any;
    horas: unknown;
    oldCategoria?: string;
    showSite?: boolean
    dataEntradaManha: string;
    dataSaidaManha: string;
    dataEntradaTarde: string;
    dataSaidaTarde: string;
    dataEntradaNoite: string;
    dataSaidaNoite: string;
    totalHorasDia?: number;
}

export interface IactionStatus extends ILinkRequest {
    status: string;
}

export interface Timesheet {
    dataEntradaManha: string;
    dataSaidaManha: string;
    dataEntradaTarde: string;
    dataSaidaTarde: string;
    dataEntradaNoite: string;
    dataSaidaNoite: string;
};

export interface ProcessedFile {
  filename: string;
  mimeType?: string;
  sizeBytes: number;
  /** Tamanho do gzip quando contentEncoding='gzip' (undefined quando 'identity') */
  gzipSizeBytes?: number;
  /** Base64 do CONTEÚDO QUE SERÁ GRAVADO (gzip ou raw), se includeBase64=true */
  base64Gzip?: string;
  /** SHA-256 (hex) calculado sobre 'payloadBytes' (sempre binário final) */
  hashSha256Hex: string;
  /** Mantido por compatibilidade; o hash é sempre do binário final */
  hashMode: 'binary' | 'base64';
  /** Bytes prontos para persistir (gzip ou raw) */
  payloadBytes: Uint8Array;
  /** 'gzip' (comprimido) | 'identity' (sem compressão) */
  contentEncoding: 'gzip' | 'identity';
}

export interface SnapshotResponse {
  id: number;
  filename: string;
  mimeType?: string;
  contentEncoding: 'gzip'|'identity';
  gzipSizeBytes?: number|null;
  originalSizeBytes: number;
  sha256Hex: string;
  base64Payload?: string|null; // pode vir null se includeBase64=false
}

export interface FileSavedResponse { 
    id: number; 
    hashSha256Hex: string; 
}

export interface ICategoria {
  id: number;
  categoria: string;
}
export interface ITag {
  id: number;
  tag: any;
}