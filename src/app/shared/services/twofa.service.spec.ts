import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { TwofaService } from './twofa.service';

describe('TwofaService', () => {
  let service: TwofaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(TwofaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
