import { DialogContentData } from 'src/app/shared/interfaces/dialog-content-data.interface';

const EMPTY_LINK_DIALOG_DATE_FIELDS = [
  'dataEntradaManha',
  'dataSaidaManha',
  'dataEntradaTarde',
  'dataSaidaTarde',
  'dataEntradaNoite',
  'dataSaidaNoite',
] as const;

type DialogDateField = typeof EMPTY_LINK_DIALOG_DATE_FIELDS[number];

export function createHeaderDialogData(categoria: string, currentDate = new Date()): DialogContentData {
  const currentLocalIsoDate = toLocalIsoDateTime(currentDate);
  const dateFields = EMPTY_LINK_DIALOG_DATE_FIELDS.reduce(
    (fields, field) => ({ ...fields, [field]: currentLocalIsoDate }),
    {} as Record<DialogDateField, string>
  );

  return {
    id: 0,
    name: '',
    uri: [],
    tag: [],
    totalHorasDia: 0,
    status: 'inclusao',
    categoria,
    descricao: '',
    ...dateFields,
  };
}

export function toLocalIsoDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = padDatePart(date.getMonth() + 1);
  const day = padDatePart(date.getDate());
  const hour = padDatePart(date.getHours());
  const minute = padDatePart(date.getMinutes());
  const second = padDatePart(date.getSeconds());

  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}
