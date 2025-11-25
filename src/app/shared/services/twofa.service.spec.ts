import { TestBed } from '@angular/core/testing';

import { TwofaService } from './twofa.service';

describe('TwofaService', () => {
  let service: TwofaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TwofaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
