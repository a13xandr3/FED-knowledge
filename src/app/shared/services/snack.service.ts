import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackService {
  private readonly snackBar = inject(MatSnackBar);

  mostrarMensagem(msg: string, action: string): void {
    this.snackBar.open(msg, action, {
      duration: 5000,
      verticalPosition: 'top',
      horizontalPosition: 'right'
    });
  }

}
