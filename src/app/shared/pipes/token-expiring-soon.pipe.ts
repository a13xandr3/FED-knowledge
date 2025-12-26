import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'tokenExpiringSoon', standalone: true, pure: false })
export class TokenExpiringSoonPipe implements PipeTransform, OnDestroy {
  private timerId: any;

  constructor(private cdr: ChangeDetectorRef) {
    this.timerId = setInterval(() => this.cdr.markForCheck(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }

  transform(token?: string, thresholdSec: number = 60): boolean {
    const raw = token || localStorage.getItem('kb_token') || '';
    const expSec = this.readExpSeconds(raw);
    if (!expSec) return false;

    const msLeft = expSec * 1000 - Date.now();
    return msLeft > 0 && msLeft <= thresholdSec * 1000;
  }

  private readExpSeconds(jwt: string): number | null {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '==='.slice((base64.length + 3) % 4);
      const json = atob(padded);
      const payload = JSON.parse(json) as { exp?: number };
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  }
}
