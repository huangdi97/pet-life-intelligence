/** Join truthy class parts; tiny stand-in for classname helpers. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
