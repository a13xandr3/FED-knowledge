import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SnackService } from './snack.service';

describe('SnackService', () => {
  let service: SnackService;
  let snackBar: { open: jest.Mock };

  beforeEach(() => {
    snackBar = { open: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    service = TestBed.inject(SnackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deve abrir snackbar com configuracao padrao', () => {
    service.mostrarMensagem('Mensagem', 'Fechar');

    expect(snackBar.open).toHaveBeenCalledWith('Mensagem', 'Fechar', {
      duration: 5000,
      verticalPosition: 'top',
      horizontalPosition: 'right'
    });
  });
});
