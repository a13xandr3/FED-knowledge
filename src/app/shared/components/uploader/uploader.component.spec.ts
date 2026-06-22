import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { UploaderComponent } from './uploader.component';
import { FileApiService } from 'src/app/shared/services/file-api.service';
import { FilePreviewBusService } from 'src/app/shared/services/file-preview.bus.service';
import { MatDialog } from '@angular/material/dialog';

describe('UploaderComponent', () => {
  let component: UploaderComponent;
  let fixture: ComponentFixture<UploaderComponent>;
  let fileApiService: { buildPreviewsFromFileIds: jest.Mock };

  beforeEach(async () => {
    fileApiService = {
      buildPreviewsFromFileIds: jest.fn().mockResolvedValue([
        { id: 1, url: 'blob:1', filename: 'a.txt', sizeBytes: 1 },
      ]),
    };

    await TestBed.configureTestingModule({
      imports: [ UploaderComponent ],
      providers: [
        { provide: FileApiService, useValue: fileApiService },
        { provide: FilePreviewBusService, useValue: { loadPreviews$: new Subject() } },
        { provide: MatDialog, useValue: { open: jest.fn() } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve delegar addPreviewsFromFileIds para InputFileComponent interno', async () => {
    await component.addPreviewsFromFileIds([1], true);
    await component.addPreviewsFromFileIds([2]);

    expect(fileApiService.buildPreviewsFromFileIds).toHaveBeenCalledWith([1]);
    expect(fileApiService.buildPreviewsFromFileIds).toHaveBeenCalledWith([2]);
  });
});
