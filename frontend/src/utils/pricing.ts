// The till's price rules, mirroring backend/utils/pricing.js so the screen,
// the cart and the server-priced receipt all quote the same number.
import { Product } from '../types';
import { safeNumber } from './number';

export type DispensingMode = 'single' | 'package';

// sellingPrice is the patient-facing retail price; unitPrice is the fallback.
export const unitPriceOf = (p: Pick<Product, 'sellingPrice' | 'unitPrice'>): number =>
  safeNumber(p.sellingPrice || p.unitPrice);

// A product can be sold by the box/bottle only when a pack size and a package
// price are both on file.
export const canSellByPackage = (p: Product): boolean =>
  safeNumber(p.unitsPerPackage) > 1 && safeNumber(p.packagePrice) > 0;

export const allowsSingleUnits = (p: Product): boolean => p.allowUnitBreakdown !== false;

export const priceForMode = (p: Product, mode: DispensingMode): number =>
  mode === 'package' ? safeNumber(p.packagePrice) : unitPriceOf(p);

// Stock is always counted in dispensing units, so a package sale deducts
// quantity × unitsPerPackage.
export const stockUnitsFor = (p: Product, mode: DispensingMode, quantity: number): number =>
  mode === 'package' ? quantity * safeNumber(p.unitsPerPackage) : quantity;

export const unitLabelFor = (p: Product, mode: DispensingMode): string =>
  mode === 'package' ? (p.packageType || 'Package') : (p.dispensingUnit || 'Unit');