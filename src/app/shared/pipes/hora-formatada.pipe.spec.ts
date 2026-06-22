import { HoraFormatadaPipe } from './hora-formatada.pipe';

describe('HoraFormatadaPipe', () => {
  let pipe: HoraFormatadaPipe;

  beforeEach(() => {
    pipe = new HoraFormatadaPipe();
  });

  it('deve criar uma instancia', () => {
    expect(pipe).toBeTruthy();
  });

  it('deve retornar 00:00 para valores nulos, indefinidos ou invalidos', () => {
    expect(pipe.transform(null)).toBe('00:00');
    expect(pipe.transform(undefined)).toBe('00:00');
    expect(pipe.transform(Number.NaN)).toBe('00:00');
  });

  it('deve formatar horas decimais para HH:mm', () => {
    expect(pipe.transform(1.5)).toBe('01:30');
    expect(pipe.transform(25.25)).toBe('25:15');
  });

  it('deve manter minutos positivos quando valor negativo for informado', () => {
    expect(pipe.transform(-1.5)).toBe('-2:30');
  });
});
