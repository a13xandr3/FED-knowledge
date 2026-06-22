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

  it('deve emitir ids normalizados e cleanBefore padrao', () => {
    const received: unknown[] = [];
    service.loadPreviews$.subscribe(value => received.push(value));

    service.requestLoad([{ id: 1 }, { fileId: 2 }, { file_id: 3 }, { fileID: 4 }, '5', 'x']);

    expect(received).toEqual([{ ids: [1, 2, 3, 4, 5], cleanBefore: true }]);
  });

  it('deve respeitar cleanBefore falso e ignorar lista invalida', () => {
    const received: unknown[] = [];
    service.loadPreviews$.subscribe(value => received.push(value));

    service.requestLoad([10], false);
    service.requestLoad(['x']);
    service.requestLoad(null as unknown as readonly unknown[]);

    expect(received).toEqual([{ ids: [10], cleanBefore: false }]);
  });
});
