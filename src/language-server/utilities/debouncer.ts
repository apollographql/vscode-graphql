import debounce from "lodash.debounce";

export function debounceHandler(
  handler: (...args: any[]) => any,
  leading: boolean = true,
) {
  return debounce(handler, 250, { leading });
}
