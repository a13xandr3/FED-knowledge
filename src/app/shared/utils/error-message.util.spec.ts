import { HttpErrorResponse } from '@angular/common/http';

import { getErrorMessage } from './error-message.util';

describe('error-message.util', () => {
  it('deve retornar mensagem de Error', () => {
    expect(getErrorMessage(new Error('erro conhecido'), 'fallback')).toBe('erro conhecido');
  });

  it('deve retornar fallback quando Error nao tiver mensagem', () => {
    expect(getErrorMessage(new Error(''), 'fallback')).toBe('fallback');
  });

  it('deve retornar mensagem de HttpErrorResponse', () => {
    const error = new HttpErrorResponse({ status: 500, statusText: 'Erro HTTP' });

    expect(getErrorMessage(error, 'fallback')).toContain('Erro HTTP');
  });

  it('deve retornar fallback para erro desconhecido', () => {
    expect(getErrorMessage('erro sem contrato', 'fallback')).toBe('fallback');
  });
});
