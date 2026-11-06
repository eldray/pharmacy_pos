// src/utils/printEngine.ts
//
// One way for anything in the app to reach paper. Every print button — the 80mm
// till slip, the A4 laboratory report — assembles a fragment here and this module
// decides how it is delivered:
//
//   * inside Electron, a hidden window prints it straight to the configured
//     printer with no dialog, which is what a till needs between customers;
//   * in a browser there is no such API, so it falls back to the print preview.
//
// Before this lived, each caller opened its own window and called print(), the
// receipt came out scaled onto A4 because nothing declared the paper size, and the
// laboratory report printed blank because the app's global `@media print` rule hid
// every element that was not marked .print-content.

export type PrintProfile = 'receipt' | 'a4';

export type PrintOutcome = 'printed' | 'dialog' | 'blocked' | 'failed';

export interface PrintResult {
  outcome: PrintOutcome;
  /** Populated when outcome is 'failed'. */
  error?: string;
  /** Which printer the job went to, when Electron reported it. */
  printer?: string;
}

export interface PrinterInfo {
  name: string;
  displayName: string;
  isDefault: boolean;
  status: number;
}

/* ─── Per-machine preferences ───────────────────────────────────────────────
   Stored in localStorage, not the database: which printer a slip goes to is a
   property of the till it is typed on, not of the company. */

const PREFS_KEY = 'pharmacy_pos.printPreferences';

export interface PrintPreference {
  silent: boolean;
  printer: string;
}

export type PrintPreferences = Record<PrintProfile, PrintPreference>;

export const DEFAULT_PREFERENCES: PrintPreferences = {
  receipt: { silent: true, printer: '' },
  a4: { silent: false, printer: '' },
};

export function readPrintPreferences(): PrintPreferences {
  const prefs = { ...DEFAULT_PREFERENCES };
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    for (const profile of ['receipt', 'a4'] as PrintProfile[]) {
      const value = stored?.[profile];
      if (value && typeof value === 'object') {
        prefs[profile] = {
          silent: value.silent !== false,
          printer: typeof value.printer === 'string' ? value.printer : '',
        };
      }
    }
  } catch {
    // A corrupt entry must not stop the till from printing; use the defaults.
  }
  return prefs;
}

export function savePrintPreferences(prefs: PrintPreferences): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/* ─── Paper profiles ────────────────────────────────────────────────────────
   The @page rule is what makes the printed sheet match the frame on screen: an
   80mm roll prints 80mm wide and only as long as the content, an A4 report gets
   A4 with a printable margin. print-color-adjust keeps the report's dark heading
   bands, which would otherwise print as blank paper with invisible white text. */

const PAGE_CSS: Record<PrintProfile, string> = {
  receipt: `
    @page { size: 80mm auto; margin: 0; }
    html, body { width: 80mm; margin: 0; padding: 0; }
  `,
  a4: `
    @page { size: A4; margin: 12mm; }
    html, body { width: 186mm; margin: 0; padding: 0; }
  `,
};

/** Electron's margin setting for the profile, kept in step with the @page rule. */
const MARGIN_TYPE: Record<PrintProfile, 'none' | 'default'> = {
  receipt: 'none',
  a4: 'default',
};

export function buildPrintDocument(fragment: string, profile: PrintProfile, title: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a1a;
      background: #ffffff;
    }
    ${PAGE_CSS[profile]}
    @media screen {
      body { padding: 12px; }
    }
  </style>
</head>
<body>${fragment}</body>
</html>`;
}

/* ─── Delivery ────────────────────────────────────────────────────────────── */

interface ElectronPrintApi {
  printHtml?: (payload: {
    html: string;
    silent: boolean;
    deviceName: string;
    marginType: 'none' | 'default';
  }) => Promise<{ success: boolean; error?: string; printer?: string }>;
  savePdf?: (payload: {
    html: string;
    fileName: string;
    marginType: 'none' | 'default';
  }) => Promise<{ success: boolean; cancelled?: boolean; path?: string; error?: string }>;
  getPrinters?: () => Promise<PrinterInfo[]>;
}

function electronApi(): ElectronPrintApi | null {
  return (window as any).electronAPI || null;
}

export function isRunningInElectron(): boolean {
  return !!electronApi()?.printHtml;
}

export async function listPrinters(): Promise<PrinterInfo[]> {
  const api = electronApi();
  if (!api?.getPrinters) return [];
  try {
    return await api.getPrinters();
  } catch {
    return [];
  }
}

/**
 * @param fragment CSS + markup for the page — not a full document, so the paper
 *                 size and colour settings stay in one place.
 */
export async function printFragment(
  fragment: string,
  { profile, title = 'Print' }: { profile: PrintProfile; title?: string },
): Promise<PrintResult> {
  if (!fragment.trim()) return { outcome: 'failed', error: 'Nothing to print' };

  const html = buildPrintDocument(fragment, profile, title);
  const prefs = readPrintPreferences()[profile];
  const api = electronApi();

  if (api?.printHtml) {
    try {
      const result = await api.printHtml({
        html,
        silent: prefs.silent,
        deviceName: prefs.printer,
        marginType: MARGIN_TYPE[profile],
      });
      if (result?.success) return { outcome: 'printed', printer: result.printer };
      return { outcome: 'failed', error: result?.error || 'The print job failed' };
    } catch (err: any) {
      return { outcome: 'failed', error: err?.message || String(err) };
    }
  }

  // Browser fallback: a new window the user prints from the preview. Pop-up
  // blocking shows up here, which is why the caller reports the outcome.
  const printWindow = window.open(
    '',
    '_blank',
    profile === 'receipt' ? 'width=340,height=640' : 'width=900,height=700',
  );
  if (!printWindow) return { outcome: 'blocked' };

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.focus();
  printWindow.onload = () => {
    setTimeout(() => {
      try {
        printWindow.print();
      } catch {
        // The preview is already open; nothing else the app can do.
      }
    }, 250);
  };
  printWindow.onafterprint = () => printWindow.close();

  return { outcome: 'dialog' };
}

/** Message a till can be shown for anything other than a clean print. */
export function describePrintOutcome(result: PrintResult): string | null {
  switch (result.outcome) {
    case 'printed':
      return null;
    case 'dialog':
      return null;
    case 'blocked':
      return 'The print window was blocked. Allow pop-ups for this site, or run the desktop app.';
    case 'failed':
      return `Printing failed: ${result.error || 'unknown error'}`;
  }
}

/**
 * "Save PDF" without the print preview: inside the desktop app the same fragment
 * is rendered to a PDF on disk, at the same paper size it would have printed on.
 * In a browser there is no file API, so it falls back to printing to PDF from the
 * preview.
 */
export async function savePdf(
  fragment: string,
  { profile, title = 'Document', fileName }: { profile: PrintProfile; title?: string; fileName: string },
): Promise<PrintResult> {
  const api = electronApi();
  if (!api?.savePdf) return printFragment(fragment, { profile, title });

  const html = buildPrintDocument(fragment, profile, title);
  try {
    const result = await api.savePdf({ html, fileName, marginType: MARGIN_TYPE[profile] });
    if (result?.success) return { outcome: 'printed' };
    if (result?.cancelled) return { outcome: 'dialog' };
    return { outcome: 'failed', error: result?.error || 'Could not write the PDF' };
  } catch (err: any) {
    return { outcome: 'failed', error: err?.message || String(err) };
  }
}
