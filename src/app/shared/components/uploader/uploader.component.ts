
import { Component, EventEmitter, Input, Output, ViewChild } from '@angular/core';

import { InputFileComponent } from '../input-file/input-file.component';
import { ProcessedFile } from 'src/app/shared/request/request';

import { PreviewItem } from 'src/app/types/Files';

@Component({
  selector: 'app-uploader',
  templateUrl: './uploader.component.html',
  styleUrls: ['./uploader.component.scss'],
  standalone: true,
  imports: [
    InputFileComponent
],
})
export class UploaderComponent {
  @Input() allowMultiple = true;
  @Input() previews: PreviewItem[] = [];

  @Output() removedAt = new EventEmitter<number>();
  @Output() processed = new EventEmitter<ProcessedFile>();
  @Output() error = new EventEmitter<unknown>();
  @Output() cleared = new EventEmitter<void>();
  @Output() removedRef = new EventEmitter<{ id?: number; index: number; filename: string }>();

  @ViewChild(InputFileComponent) private inner!: InputFileComponent;

  addPreviewsFromFileIds(ids: number[], cleanBefore = false) {
    return this.inner.addPreviewsFromFileIds(ids, cleanBefore);
  }
}
