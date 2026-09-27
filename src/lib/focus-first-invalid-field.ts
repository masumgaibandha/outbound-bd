/**
 * After a failed submit, brings the first invalid field (in DOM order, not
 * validation-issue order) into view and focuses it, so a message rendered
 * far above the submit button is never missed. Each field's `id` must
 * match its key in `errors`, which is already the convention in every lead
 * form. Client-only: call it from an event handler.
 */
export function focusFirstInvalidField(
  form: HTMLFormElement,
  errors: Partial<Record<string, string>>,
): void {
  const first = Array.from(form.elements).find(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element.id !== "" && Boolean(errors[element.id]),
  );
  if (!first) return;

  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  first.scrollIntoView?.({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
  first.focus({ preventScroll: true });
}
