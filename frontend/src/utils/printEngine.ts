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
  /**
   * The job was accepted but the device cannot deliver it — an offline or jammed
   * printer, or a queue blocked by a stuck job. Worth showing even on success.
   */
  warning?: string;
  /** Where a PDF was written, when the outcome came from Save PDF. */
  path?: string;
}

export interface PrinterInfo {
  name: string;
  displayName: string;
  description: string;
  /** From Windows; Chromium's own printer list does not carry it. */
  isDefault: boolean;
  /** Windows' device state ("Normal", "Error", "Offline"…), null if unreadable. */
  status: string | null;
  queuedJobs: number;
  stuckJobs: number;
}

/** States that need someone to intervene; "Printing" and "WarmingUp" do not. */
const PRINTER_FAULTS = new Set([
  'error', 'offline', 'paused', 'paperjam', 'paperout', 'paperproblem', 'dooropen',
  'notavailable', 'userinterventionrequired', 'outofmemory', 'notoner',
  'pendingdeletion', 'server_unknown',
]);

export function printerHasProblem(p: PrinterInfo): boolean {
  return p.stuckJobs > 0 || (!!p.status && PRINTER_FAULTS.has(p.status.toLowerCase()));
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

/** The roll width chosen in Preferences → Receipt. The content is narrower than
    the roll because a thermal printer cannot print to the very edge. */
export interface ReceiptPaper {
  widthMm: number;
  contentMm: number;
}

const RECEIPT_PREFS_KEY = 'pharmacy_preferences';

export function getReceiptPaper(): ReceiptPaper {
  let compact = false;
  try {
    compact = JSON.parse(localStorage.getItem(RECEIPT_PREFS_KEY) || '{}')?.receiptPaperSize === '58mm';
  } catch {
    // A corrupt entry must not stop the till from printing; use the wide roll.
  }
  return compact ? { widthMm: 58, contentMm: 50 } : { widthMm: 80, contentMm: 72 };
}

function pageCss(profile: PrintProfile): string {
  if (profile === 'a4') {
    return `
    @page { size: A4; margin: 12mm; }
    html, body { width: 186mm; margin: 0; padding: 0; }
  `;
  }
  const { widthMm } = getReceiptPaper();
  return `
    @page { size: ${widthMm}mm auto; margin: 0; }
    html, body { width: ${widthMm}mm; margin: 0; padding: 0; }
  `;
}

/**
 * Chromium refuses a page size whose height is `auto` — it discards the whole
 * declaration and prints the slip on whatever paper the driver defaults to,
 * which is how an 80mm receipt ended up centred on a Letter sheet. The roll is
 * continuous, so the length is measured from the laid-out content and stated
 * explicitly. This runs in the print document itself, so the desktop app and the
 * browser preview both get the same page box from one implementation.
 */
function receiptFitScript(widthMm: number): string {
  return `<script>
(function () {
  var PX_PER_MM = 96 / 25.4;
  var style = document.getElementById('print-page-size');
  function fit() {
    var height = document.body.getBoundingClientRect().height / PX_PER_MM;
    // A millimetre of slack keeps the last line clear of the cutter.
    var length = (Math.ceil(height * 10) / 10 + 1).toFixed(1);
    style.textContent = '@page { size: ${widthMm}mm ' + length + 'mm; margin: 0; }'
      + ' html, body { width: ${widthMm}mm; margin: 0; padding: 0; }';
  }
  fit();
  window.addEventListener('load', fit);
})();
</script>`;
}

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
    @media screen {
      body { padding: 12px; }
    }
  </style>
  <style id="print-page-size">${pageCss(profile)}</style>
</head>
<body>${fragment}${profile === 'receipt' ? receiptFitScript(getReceiptPaper().widthMm) : ''}</body>
</html>`;
}

/* ─── Delivery ────────────────────────────────────────────────────────────── */

interface ElectronPrintApi {
  printHtml?: (payload: {
    html: string;
    silent: boolean;
    deviceName: string;
    marginType: 'none' | 'default';
  }) => Promise<{ success: boolean; error?: string; printer?: string; warning?: string; failureType?: string }>;
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
    const send = (silent: boolean, deviceName = prefs.printer) => api.printHtml!({
      html,
      silent,
      deviceName,
      marginType: MARGIN_TYPE[profile],
    });
    try {
      const result = await send(prefs.silent);
      if (result?.success) {
        return { outcome: 'printed', printer: result.printer, warning: result.warning };
      }
      // A printer that was unplugged or renamed since Preferences was last opened
      // never receives the job. Rather than leave the cashier with nothing, hand
      // it to the Windows dialog — with the dead name dropped, or the dialog is
      // rejected for the same invalid device and nothing appears at all.
      if (prefs.silent && result?.failureType === 'printer-invalid') {
        const retry = await send(false, '');
        if (retry?.success) {
          return {
            outcome: 'dialog',
            printer: retry.printer,
            warning: `${result.error} Choose a printer in the Windows dialog to print this one.`,
          };
        }
        if (retry?.failureType === 'cancelled') {
          return { outcome: 'dialog', warning: `${result.error} Nothing was printed.` };
        }
      }
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

/** Message a till can be shown for anything other than a clean, delivered print. */
export function describePrintOutcome(result: PrintResult): string | null {
  switch (result.outcome) {
    case 'printed':
      return result.warning || (result.path ? `Saved to ${result.path}` : null);
    case 'dialog':
      return result.warning || null;
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
    if (result?.success) return { outcome: 'printed', path: result.path };
    if (result?.cancelled) return { outcome: 'dialog' };
    return { outcome: 'failed', error: result?.error || 'Could not write the PDF' };
  } catch (err: any) {
    return { outcome: 'failed', error: err?.message || String(err) };
  }
}
