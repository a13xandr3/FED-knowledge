import type { LinkFilePayload, LinkTagPayload, LinkUriPayload } from '../request/request';

export interface ILinks {
    atividades: ILinksResponse[],
    total: number;
}
export interface ILinksResponse {
    id: number;
    name: string;
    uri: LinkUriPayload | { uri?: string } | string | null;
    categoria: string;
    subCategoria?: string;
    descricao: string;
    tag: LinkTagPayload | Array<{ tags?: string[] }> | string[] | null;
    fileID?: LinkFilePayload;
    dataEntradaManha?: string | null;
    dataSaidaManha?: string | null;
    dataEntradaTarde?: string | null;
    dataSaidaTarde?: string | null;
    dataEntradaNoite?: string | null;
    dataSaidaNoite?: string | null;
    totalHorasDia?: number | null;
}
