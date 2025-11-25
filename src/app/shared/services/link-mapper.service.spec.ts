import { TestBed } from '@angular/core/testing';

import { LinkMapperService } from './link-mapper.service';

describe('LinkMapperService', () => {
  let service: LinkMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LinkMapperService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
