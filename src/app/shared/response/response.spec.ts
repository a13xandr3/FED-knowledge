import { ILinks, ILinksResponse } from './response';

describe('Response interfaces', () => {
  it('should model a links response list correctly', () => {
    const item: ILinksResponse = {
      id: 1,
      name: 'Activity',
      uri: { uri: 'https://example.com' },
      categoria: 'Test',
      descricao: 'desc',
      tag: { tags: [] }
    };
    const resp: ILinks = { atividades: [item], total: 1 };
    expect(resp.total).toBe(1);
    expect(resp.atividades[0].name).toEqual('Activity');
  });
});