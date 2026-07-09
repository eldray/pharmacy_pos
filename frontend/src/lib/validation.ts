// Shared client-side validation. Mirrors the backend rules so users get
// immediate, specific feedback instead of a generic failure after submit.

export type ValidationErrors = Record<string, string>;

// Human-readable summary of the password policy (show as a form hint).
export const PASSWORD_RULE =
  'At least 8 characters, including an uppercase letter, a lowercase letter, and a number.';

export function validatePassword(pw: string): string | null {
  if (!pw) return 'Password is required';
  if (pw.length < 8) return 'Password must be at least 8 characters long';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain a number';
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address';
  return null;
}

// Product form: name, category, selling price.
export function validateProduct(v: { name: string; category: string; unitPrice: string | number }): ValidationErrors {
  const e: ValidationErrors = {};
  if (!String(v.name || '').trim()) e.name = 'Product name is required';
  if (!String(v.category || '').trim()) e.category = 'Category is required';

  const price = parseFloat(String(v.unitPrice));
  if (v.unitPrice === '' || v.unitPrice === null || v.unitPrice === undefined || isNaN(price)) {
    e.unitPrice = 'Selling price is required';
  } else if (price < 0) {
    e.unitPrice = 'Price cannot be negative';
  }
  return e;
}

// Staff form. `requirePassword` is false when editing (blank = keep current).
export function validateUser(
  v: { name: string; email: string; password: string; role: string },
  requirePassword: boolean
): ValidationErrors {
  const e: ValidationErrors = {};
  if (!String(v.name || '').trim()) e.name = 'Full name is required';

  const emailErr = validateEmail(v.email);
  if (emailErr) e.email = emailErr;

  if (!v.role) e.role = 'Role is required';

  // Validate the password when it's required, or whenever one was entered.
  if (requirePassword || v.password) {
    const pwErr = validatePassword(v.password);
    if (pwErr) e.password = pwErr;
  }
  return e;
}
