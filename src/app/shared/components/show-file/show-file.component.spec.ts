import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ShowFileComponent } from './show-file.component';
import { FileApiService } from 'src/app/shared/services/file-api.service';

describe('ShowFileComponent', () => {
  let component: ShowFileComponent;
  let fixture: ComponentFixture<ShowFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ ShowFileComponent ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: null },
        { provide: MatDialogRef, useValue: { close: jest.fn() } },
        { provide: FileApiService, useValue: { download: jest.fn() } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShowFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
