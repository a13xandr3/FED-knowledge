import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { FileApiService } from './file-api.service';

describe('FileApiService', () => {
  let service: FileApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(FileApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
