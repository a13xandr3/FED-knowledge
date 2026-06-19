import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SnackService } from './snack.service';

describe('SnackService', () => {
  let service: SnackService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: { open: jest.fn() } },
      ],
    });
    service = TestBed.inject(SnackService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
