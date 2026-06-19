import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { UploaderComponent } from './uploader.component';
import { FileApiService } from 'src/app/shared/services/file-api.service';
import { FilePreviewBusService } from 'src/app/shared/services/file-preview.bus.service';
import { MatDialog } from '@angular/material/dialog';

describe('UploaderComponent', () => {
  let component: UploaderComponent;
  let fixture: ComponentFixture<UploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ UploaderComponent ],
      providers: [
        { provide: FileApiService, useValue: {} },
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
});
