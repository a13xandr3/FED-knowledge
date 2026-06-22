import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TokenTimeLeftPipe } from './token-time-left.pipe';

function createJwt(exp: number | string): string {
  const payload = btoa(JSON.stringify({ exp }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `header.${payload}.signature`;
}

@Component({
  template: '{{ token | tokenTimeLeft:fallback }}',
  imports: [TokenTimeLeftPipe],
})
class HostComponent {
  token = '';
  fallback = 'sem-token';
}

@Component({
  template: '{{ token | tokenTimeLeft }}',
  imports: [TokenTimeLeftPipe],
})
class DefaultFallbackHostComponent {
  token = '';
}

describe('TokenTimeLeftPipe', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, DefaultFallbackHostComponent],
    }).compileComponents();

    jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
    localStorage.clear();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    fixture.destroy();
    localStorage.clear();
  });

  it('deve retornar fallback quando token nao tem exp', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('sem-token');
  });

  it('deve retornar expirado quando token ja expirou', () => {
    host.token = createJwt(999);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('expirado');
  });

  it('deve retornar menos de um segundo quando falta menos de 1000ms', () => {
    host.token = createJwt(1_000.5);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('< 1s');
  });

  it('deve formatar mm:ss e hh:mm:ss', () => {
    host.token = createJwt(1_061);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('01:01');

    host.token = createJwt(4_661);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('01:01:01');
  });

  it('deve usar token do localStorage quando parametro nao for informado', () => {
    localStorage.setItem('kb_token', createJwt(1_061));

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('01:01');
  });

  it('deve usar fallback padrao e marcar view no timer', () => {
    jest.useFakeTimers();
    const defaultFixture = TestBed.createComponent(DefaultFallbackHostComponent);

    defaultFixture.detectChanges();
    jest.advanceTimersByTime(1000);

    expect(defaultFixture.nativeElement.textContent.trim()).toBe('—');
    defaultFixture.destroy();
  });
});
