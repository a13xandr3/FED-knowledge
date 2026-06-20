import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { FileApiService } from './file-api.service';

describe('FileApiService', () => {
  let service: FileApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(FileApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
