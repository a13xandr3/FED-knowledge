import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
@Injectable({
  providedIn: 'root'
})
export class SnackService {

  constructor(
    private snackBar: MatSnackBar
  ) { }

  mostrarMensagem(msg: string, action: string): void {
    this.snackBar.open(msg, action, {
      duration: 5000,
      verticalPosition: 'top',
      horizontalPosition: 'right'
    });
  }

}
