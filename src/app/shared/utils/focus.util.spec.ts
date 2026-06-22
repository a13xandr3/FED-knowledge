import { clearElementFocus } from './focus.util';

describe('focus.util', () => {
  it('deve remover foco do alvo do evento e do elemento ativo', () => {
    const eventTarget = { blur: jest.fn() };
    const activeElement = { blur: jest.fn() };
    const ownerDocument = { activeElement } as unknown as Document;
    const event = { target: eventTarget as unknown as EventTarget } as Event;

    clearElementFocus(event, ownerDocument);

    expect(eventTarget.blur).toHaveBeenCalledTimes(1);
    expect(activeElement.blur).toHaveBeenCalledTimes(1);
  });

  it('deve ignorar alvos sem blur', () => {
    expect(() => clearElementFocus()).not.toThrow();
  });
});
