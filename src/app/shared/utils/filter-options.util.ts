import { SelectOption } from 'src/app/shared/models/select-option.model';

const DEFAULT_ALL_OPTION = 'todos';

export function createFilterOptions(response: unknown): readonly SelectOption<string>[] {
  return [DEFAULT_ALL_OPTION, ...toStringArray(response)].map(toSelectOption);
}

function toStringArray(response: unknown): string[] {
  return Array.isArray(response)
    ? response.filter((item): item is string => typeof item === 'string')
    : [];
}

function toSelectOption(value: string): SelectOption<string> {
  return { value, label: value };
}
