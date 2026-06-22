import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform, inject } from '@angular/core';

import { readJwtExpSeconds } from 'src/app/shared/utils/jwt-expiration.util';

@Pipe({
  name: 'tokenTimeLeft',
  standalone: true,
  // impuro para recalcular em cada marcação e “ticar” com nosso timer
  pure: false,
})
export class TokenTimeLeftPipe implements PipeTransform, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly timerId: ReturnType<typeof setInterval>;

  constructor() {
    // força atualização 1x por segundo (funciona com OnPush também)
    this.timerId = setInterval(() => this.cdr.markForCheck(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }

  transform(token?: string, fallbackLabel: string = '—'): string {
    const raw = token || localStorage.getItem('kb_token') || '';

    const expSec = readJwtExpSeconds(raw);
    if (!expSec) return fallbackLabel;

    const msLeft = expSec * 1000 - Date.now();
    if (msLeft <= 0) return 'expirado';
    if (msLeft < 1000) return '< 1s';

    return this.formatHHMMSS(msLeft);
  }

  private formatHHMMSS(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
}
