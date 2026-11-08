// Units used when adding a product.
//
// Stock is always counted in the SMALLEST unit you sell (a tablet, an ampoule,
// a ml...). Packs/boxes only exist on purchase orders, where "Units per pack" converts
// the quantity ordered into units.

/** What you sell and count stock in. */
export const DISPENSING_UNITS = [
  'Tablet', 'Capsule', 'Ampoule', 'Vial', 'Sachet', 'Strip', 'Monopack',
  'Bottle', 'Tube', 'Suppository', 'Pessary', 'Patch',
  'Inhaler', 'Pen', 'Syringe', 'Piece', 'Pair', 'Roll', 'ml', 'g',
] as const;

/** Options for a <select>, keeping any legacy value already saved on a product. */
export const withCurrent = (list: readonly string[], current?: string): string[] =>
  current && !list.includes(current) ? [...list, current] : [...list];
