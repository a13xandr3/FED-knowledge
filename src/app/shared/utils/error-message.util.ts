import { HttpErrorResponse } from '@angular/common/http';

export function getErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof HttpErrorResponse || error instanceof Error) {
    return error.message || fallbackMessage;
  }

  return fallbackMessage;
}
