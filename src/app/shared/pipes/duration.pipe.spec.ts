import { DurationPipe } from './duration.pipe';

describe('DurationPipe', () => {
  let pipe: DurationPipe;

  beforeEach(() => {
    pipe = new DurationPipe();
  });

  it('deve criar uma instancia', () => {
    expect(pipe).toBeTruthy();
  });

  it('deve retornar zero para valores nulos, indefinidos ou negativos', () => {
    expect(pipe.transform(null)).toBe('0d 00:00:00');
    expect(pipe.transform(undefined)).toBe('0d 00:00:00');
    expect(pipe.transform(-1)).toBe('0d 00:00:00');
  });

  it('deve formatar duracao com dias, horas, minutos e segundos', () => {
    expect(pipe.transform(90061_000)).toBe('1d 01:01:01');
  });

  it('deve arredondar para cima evitando zero antes do ultimo segundo', () => {
    expect(pipe.transform(1)).toBe('0d 00:00:01');
  });
});
