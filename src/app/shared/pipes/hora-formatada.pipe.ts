import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'horaFormatada',
  standalone: true,
})
export class HoraFormatadaPipe implements PipeTransform {

transform(value: number | null | undefined): string {
  if (value == null || !isFinite(value)) return '00:00';

    // converte o valor em minutos e arredonda ao minuto mais próximo
    const totalMinutes = Math.round(value * 60);

    // normaliza horas e minutos
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.abs(totalMinutes % 60); // % pode dar negativo se totalMinutes < 0

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}