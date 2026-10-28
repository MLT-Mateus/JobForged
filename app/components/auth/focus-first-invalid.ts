/** Move keyboard focus to the first invalid control in the form's reading order. */
export function focusFirstInvalid(form: HTMLFormElement, names: readonly string[]) {
  for (const name of names) {
    const control = form.elements.namedItem(name);
    if (control instanceof HTMLElement && !control.hasAttribute("disabled")) {
      control.focus();
      return;
    }
  }
}
