import { ILinkRequest, IactionStatus, ProcessedFile } from './request';

describe('Request interfaces', () => {
  it('should allow creation of a link request', () => {
    const req: ILinkRequest = {
      id: 1,
      name: 'Sample',
      uri: { uris: ['https://test.com'] },
      categoria: 'Test',
      subCategoria: 'Sub',
      descricao: 'Desc',
      tag: { tags: ['tag1'] },
      horas: null,
      dataEntradaManha: '',
      dataSaidaManha: '',
      dataEntradaTarde: '',
      dataSaidaTarde: '',
      dataEntradaNoite: '',
      dataSaidaNoite: ''
    };
    expect(req.name).toEqual('Sample');
  });

  it('should type a ProcessedFile correctly', () => {
    const file: ProcessedFile = {
      filename: 'file.txt',
      mimeType: 'text/plain',
      sizeBytes: 10,
      hashSha256Hex: 'abc',
      hashMode: 'binary',
      payloadBytes: new Uint8Array([1, 2, 3]),
      contentEncoding: 'identity'
    };
    expect(file.filename).toContain('file');
  });
});