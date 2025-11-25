import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'tokenTimeLeft',
  standalone: true,
  // impuro para recalcular em cada marcação e “ticar” com nosso timer
  pure: false,
})
export class TokenTimeLeftPipe implements PipeTransform, OnDestroy {
  private timerId: any;

  constructor(private cdr: ChangeDetectorRef) {
    // força atualização 1x por segundo (funciona com OnPush também)
    this.timerId = setInterval(() => this.cdr.markForCheck(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }

  transform(token?: string, fallbackLabel: string = '—'): string {
    const raw = token || localStorage.getItem('kb_token') || '';

    const expSec = this.readExpSeconds(raw);
    if (!expSec) return fallbackLabel;

    const msLeft = expSec * 1000 - Date.now();
    if (msLeft <= 0) return 'expirado';

    return this.formatHHMMSS(msLeft);
  }

  // === helpers ===

  private readExpSeconds(jwt: string): number | null {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    try {
      const base64Url = parts[1];
      // Base64URL -> Base64 + padding
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '==='.slice((base64.length + 3) % 4);
      const json = atob(padded);
      const payload = JSON.parse(json) as { exp?: number };
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
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