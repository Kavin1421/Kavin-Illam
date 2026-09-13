/** Slug helpers for project URLs */

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function projectCodeFromSlug(slug: string): string {
  const letters = slug
    .split("-")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 3);
  return letters.padEnd(3, "X");
}
