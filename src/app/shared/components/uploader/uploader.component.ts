import { ChangeDetectionStrategy, Component, input, output, viewChild } from '@angular/core';

import { InputFileComponent } from '../input-file/input-file.component';
import { ProcessedFile } from 'src/app/shared/request/request';

import { PreviewItem } from 'src/app/types/Files';

@Component({
  selector: 'app-uploader',
  templateUrl: './uploader.component.html',
  styleUrl: './uploader.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    InputFileComponent
  ]
})
export class UploaderComponent {
  readonly allowMultiple = input(true);
  readonly previews = input<PreviewItem[]>([]);

  readonly removedAt = output<number>();
  readonly processed = output<ProcessedFile>();
  readonly error = output<unknown>();
  readonly cleared = output<void>();
  readonly removedRef = output<{ id?: number; index: number; filename: string }>();

  private readonly inner = viewChild.required(InputFileComponent);

  addPreviewsFromFileIds(ids: number[], cleanBefore = false): Promise<void> {
    return this.inner().addPreviewsFromFileIds(ids, cleanBefore);
  }
}
