import { ChangeDetectorRef, OnDestroy, Pipe, PipeTransform, inject } from '@angular/core';

import { readJwtExpSeconds } from 'src/app/shared/utils/jwt-expiration.util';

@Pipe({ name: 'tokenExpiringSoon', standalone: true, pure: false })
export class TokenExpiringSoonPipe implements PipeTransform, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly timerId: ReturnType<typeof setInterval>;

  constructor() {
    this.timerId = setInterval(() => this.cdr.markForCheck(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timerId);
  }

  transform(token?: string, thresholdSec: number = 60): boolean {
    const raw = token || localStorage.getItem('kb_token') || '';
    const expSec = readJwtExpSeconds(raw);
    if (!expSec) return false;

    const msLeft = expSec * 1000 - Date.now();
    return msLeft > 0 && msLeft <= thresholdSec * 1000;
  }

}
