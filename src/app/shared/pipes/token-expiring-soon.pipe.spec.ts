import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TokenExpiringSoonPipe } from 'src/app/shared/pipes/token-expiring-soon.pipe';

function createJwt(exp: number | string): string {
  const payload = btoa(JSON.stringify({ exp }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `header.${payload}.signature`;
}

@Component({
  template: '{{ token | tokenExpiringSoon:threshold }}',
  imports: [TokenExpiringSoonPipe],
})
class HostComponent {
  token = '';
  threshold = 60;
}

@Component({
  template: '{{ token | tokenExpiringSoon }}',
  imports: [TokenExpiringSoonPipe],
})
class DefaultThresholdHostComponent {
  token = '';
}

describe('TokenExpiringSoonPipe', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, DefaultThresholdHostComponent],
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

  it('deve retornar true quando token expira dentro do limite', () => {
    host.token = createJwt(1_030);
    host.threshold = 60;

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('true');
  });

  it('deve retornar false quando token esta fora do limite ou expirado', () => {
    host.token = createJwt(1_120);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('false');

    host.token = createJwt(999);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('false');
  });

  it('deve usar token do localStorage e retornar false para token invalido', () => {
    localStorage.setItem('kb_token', createJwt(1_030));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('true');

    localStorage.setItem('kb_token', createJwt('sem-exp-numerico'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent.trim()).toBe('false');
  });

  it('deve usar threshold padrao e marcar view no timer', () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    const defaultFixture = TestBed.createComponent(DefaultThresholdHostComponent);
    defaultFixture.componentInstance.token = createJwt(1_030);

    defaultFixture.detectChanges();
    jest.advanceTimersByTime(1000);

    expect(defaultFixture.nativeElement.textContent.trim()).toBe('true');
    defaultFixture.destroy();
  });
});
