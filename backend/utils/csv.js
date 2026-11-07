// backend/utils/csv.js
//
// Minimal RFC 4180 reader for the product import: quoted fields, escaped quotes
// (""), commas and newlines inside quotes, CRLF or LF line endings, and a UTF-8
// BOM (Excel writes one). Deliberately dependency-free — the backend ships to a
// pharmacy's machine and every extra package is another thing to install there.

function parseCsv(text) {
  const src = String(text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"' && field === '') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      // A blank line is not a record.
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }

  if (quoted) throw new Error('Unterminated quoted field — check for a missing closing " in the CSV');
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);

  if (!rows.length) return [];

  const header = rows[0].map((h) => h.trim());
  const duplicates = header.filter((h, i) => header.indexOf(h) !== i);
  if (duplicates.length) throw new Error(`Duplicate CSV column(s): ${[...new Set(duplicates)].join(', ')}`);

  return rows.slice(1).map((cells) => {
    const record = {};
    header.forEach((key, i) => { record[key] = (cells[i] ?? '').trim(); });
    return record;
  });
}

module.exports = { parseCsv };