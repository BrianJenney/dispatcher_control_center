export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts.at(-1) : undefined;
  return last ? `${parts[0] ?? ""} ${last.charAt(0).toUpperCase()}.` : name.trim();
}
