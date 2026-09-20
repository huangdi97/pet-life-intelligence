/** Human datetime for zh-CN UI. Mirrors apps/web/lib/hooks.ts formatting
 *  (toLocaleString zh-CN, 24h). Invalid input is echoed back unchanged. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", { hour12: false });
}
