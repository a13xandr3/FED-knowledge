import { TestBed } from '@angular/core/testing';

import { LinkMapperService } from './link-mapper.service';

describe('LinkMapperService', () => {
  let service: LinkMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LinkMapperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deve normalizar tags, uris e fileIDs de formatos conhecidos', () => {
    expect(service.normalizeTags({ tag: [{ tags: ['angular', { value: 'jest' }, { tag: 'solid' }, 123] }] }))
      .toEqual(['angular', 'jest', 'solid', '123']);
    expect(service.normalizeTags(null)).toEqual([]);

    expect(service.normalizeUris({ uri: [{ uris: ['http://a', { value: 'http://b' }, { uri: 'http://c' }, 10] }] }))
      .toEqual(['http://a', 'http://b', 'http://c', '10']);
    expect(service.normalizeUris(undefined)).toEqual([]);

    expect(service.normalizeFileID({ fileID: [{ fileID: ['1', { value: '2' }, { fileID: '3' }, { other: 4 }] }] }))
      .toEqual(['1', '2', '3', '[object Object]']);
    expect(service.normalizeFileID({ fileID: [] })).toEqual([]);
  });

  it('deve converter texto para title case', () => {
    expect(service.toTitleCase('timesheet dev')).toBe('Timesheet Dev');
  });

  it('deve converter datas entre formato BR e ISO local', () => {
    expect(service.toDateBr(null)).toBeNull();
    expect(service.toDateBr('2026-01-02T03:04:05')).toBe('02/01/2026, 03:04:05');
    expect(service.ISODate(null)).toBeNull();
    expect(service.ISODate('02/01/2026 03:04:05')).toBe('2026-01-02T03:04:05');
    expect(service.ISODate('2/1/2026 3:4')).toBe('2026-01-02T03:04:00');
  });

  it('deve montar request de timesheet com arquivos novos e existentes', () => {
    const request = service.buildRequest(
      {
        id: '7',
        name: 'Atividade',
        categoria: 'timesheet',
        subCategoria: 'dev',
        descricao: 'Descricao',
        dataEntradaManha: '02/01/2026, 03:04:05',
        dataSaidaManha: '02/01/2026 04:04:05',
        dataEntradaTarde: '02/01/2026 05:04:05',
        dataSaidaTarde: '02/01/2026 06:04:05',
        dataEntradaNoite: '02/01/2026 07:04:05',
        dataSaidaNoite: '02/01/2026 08:04:05',
      },
      ['tag'],
      ['uri'],
      { files: [{ id: 10, filename: 'a.txt' }, { id: undefined as unknown as number, filename: 'b.txt' }] }
    );

    expect(request).toEqual({
      id: 7,
      name: 'Atividade',
      uri: { uris: ['uri'] },
      categoria: 'Timesheet',
      subCategoria: 'Dev',
      descricao: 'Descricao',
      tag: { tags: ['tag'] },
      fileID: { fileRefs: [{ id: 10, filename: 'a.txt' }, { id: -1, filename: 'b.txt' }] },
      dataEntradaManha: '2026-01-02T03:04:05',
      dataSaidaManha: '2026-01-02T04:04:05',
      dataEntradaTarde: '2026-01-02T05:04:05',
      dataSaidaTarde: '2026-01-02T06:04:05',
      dataEntradaNoite: '2026-01-02T07:04:05',
      dataSaidaNoite: '2026-01-02T08:04:05',
    });
  });

  it('deve montar request nao-timesheet sem datas e converter arquivos legados', () => {
    const request = service.buildRequest(
      {
        name: 'Card',
        categoria: '',
        subCategoria: '',
        descricao: 'Descricao',
      },
      undefined as unknown as string[],
      undefined as unknown as string[],
      ['a.txt', '', 'b.txt']
    );

    expect(request).toEqual({
      id: undefined,
      name: 'Card',
      uri: { uris: [] },
      categoria: '',
      subCategoria: '',
      descricao: 'Descricao',
      tag: { tags: [] },
      fileID: { fileRefs: [{ id: -1, filename: 'a.txt' }, { id: -1, filename: 'b.txt' }] },
      dataEntradaManha: null,
      dataSaidaManha: null,
      dataEntradaTarde: null,
      dataSaidaTarde: null,
      dataEntradaNoite: null,
      dataSaidaNoite: null,
    });
  });

  it('deve montar request com lista de arquivos vazia para entrada invalida', () => {
    const request = service.buildRequest(
      { name: 'Card', categoria: 'ti', descricao: '' },
      [],
      [],
      null as unknown as string[]
    );

    expect(request.fileID).toEqual({ fileRefs: [] });
  });

  it('deve emitir contagem regressiva em milissegundos ate zero', () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);

    const values: number[] = [];
    const sub = service.countdown(2_000).subscribe(value => values.push(value));

    jest.advanceTimersByTime(1_000);
    jest.advanceTimersByTime(1_000);

    expect(values).toEqual([2_000, 1_000, 0]);

    sub.unsubscribe();
    jest.useRealTimers();
  });
});
