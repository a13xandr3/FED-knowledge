import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'duration',
  standalone: true,
})
export class DurationPipe implements PipeTransform {

  transform(value: number | null | undefined): string {
    if (value == null || value < 0) return '0d 00:00:00';

    // usar ceil evita mostrar 0:00:00 antes do último segundo por jitter de Date.now()
    const totalSeconds = Math.ceil(value / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const dayPart = `${days}d `;
    const hourPart = hours.toString().padStart(2, '0');
    const minutePart = minutes.toString().padStart(2, '0');
    const secondPart = seconds.toString().padStart(2, '0');

    return `${dayPart}${hourPart}:${minutePart}:${secondPart}`;
  }

}
