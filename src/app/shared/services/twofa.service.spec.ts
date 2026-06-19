import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TwofaService } from './twofa.service';

describe('TwofaService', () => {
  let service: TwofaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(TwofaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
