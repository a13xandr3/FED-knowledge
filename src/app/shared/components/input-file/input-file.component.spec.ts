import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject } from 'rxjs';
import { InputFileComponent } from './input-file.component';
import { FileApiService } from 'src/app/shared/services/file-api.service';
import { FilePreviewBusService } from 'src/app/shared/services/file-preview.bus.service';

describe('InputFileComponent', () => {
  let component: InputFileComponent;
  let fixture: ComponentFixture<InputFileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InputFileComponent ],
      imports: [ RouterTestingModule ],
      providers: [
        { provide: FileApiService, useValue: {} },
        { provide: FilePreviewBusService, useValue: { loadPreviews$: new Subject() } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(InputFileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
