import { TestBed } from '@angular/core/testing';
import { ComportamentoService, Comportamento } from './comportamento.service';

describe('ComportamentoService', () => {
  let service: ComportamentoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ComportamentoService);
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  it('deve adicionar um comportamento', (done) => {
    const comportamento: Comportamento = { id: '1', name: 'Teste', url: 'http://teste.com' };
    
    service.adicionar(comportamento);

    service.comportamentos$.subscribe(lista => {
      expect(lista.length).toBe(1);
      expect(lista[0]).toEqual(comportamento);
      done();
    });
  });

  it('deve limpar a lista de comportamentos', (done) => {
    const comportamento: Comportamento = { id: '1', name: 'Teste', url: 'http://teste.com' };
    
    service.adicionar(comportamento);
    service.limpar();

    service.comportamentos$.subscribe(lista => {
      expect(lista.length).toBe(0);
      done();
    });
  });

  it('deve manter múltiplos comportamentos adicionados', (done) => {
    const comportamentos: Comportamento[] = [
      { id: '1', name: 'Primeiro', url: 'http://primeiro.com' },
      { id: '2', name: 'Segundo', url: 'http://segundo.com' }
    ];

    comportamentos.forEach(c => service.adicionar(c));

    service.comportamentos$.subscribe(lista => {
      expect(lista.length).toBe(2);
      expect(lista).toEqual(comportamentos);
      done();
    });
  });
});
