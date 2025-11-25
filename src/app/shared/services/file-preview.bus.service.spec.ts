import { TestBed } from '@angular/core/testing';

import { FilePreviewBusService } from './file-preview.bus.service';

describe('FilePreviewBusService', () => {
  let service: FilePreviewBusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FilePreviewBusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
