export function truncate(s: string, maxChars: number): string {
  return s.length <= maxChars ? s : `${s.slice(0, maxChars)}…[truncated]`;
}

/** Make a compiler message safe for the user: strip directories, bound the length. */
export function redactCompileMessage(raw: string): string | null {
  const cleaned = raw.replace(/(?:\/[\w.\-]+)+\//g, "").trim();
  return cleaned ? truncate(cleaned, 1024) : null;
}
