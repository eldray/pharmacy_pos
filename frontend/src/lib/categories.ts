// Shared product category list.
// Curated pharmacy categories used by the product form dropdown and POS filters.
// Users can still add a custom category inline ("Add new…") in the product form.

export const PRODUCT_CATEGORIES = [
  'Pain Relief',
  'Antibiotics',
  'Antivirals',
  'Antifungals',
  'Antihistamine',
  'Cardiovascular',
  'Diabetes',
  'Gastrointestinal',
  'Respiratory',
  'Vitamins',
  'Supplements',
  'Dermatology',
  'Ophthalmic',
  'First Aid',
  'Medical Supplies',
  'Personal Care',
  'Other',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number] | string;

// Merge the curated list with any categories already present in the data,
// so custom/legacy categories still show up in the dropdown. Returns a sorted,
// de-duplicated list with "Other" kept last.
export function getCategoryOptions(existing: string[] = []): string[] {
  const set = new Set<string>(PRODUCT_CATEGORIES);
  existing.forEach((c) => { if (c && c.trim()) set.add(c.trim()); });
  const all = Array.from(set);
  const other = all.filter((c) => c === 'Other');
  const rest = all.filter((c) => c !== 'Other').sort((a, b) => a.localeCompare(b));
  return [...rest, ...other];
}
