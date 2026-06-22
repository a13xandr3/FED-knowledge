export function clearElementFocus(event?: Event, ownerDocument?: Document): void {
  blurIfPossible(event?.target);
  blurIfPossible(ownerDocument?.activeElement);
}

function blurIfPossible(target: EventTarget | Element | null | undefined): void {
  if (target && 'blur' in target && typeof target.blur === 'function') {
    target.blur();
  }
}
