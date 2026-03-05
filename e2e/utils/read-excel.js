/**
 * Read e2e-input.xlsx and return { sheetName: { colName: value } } for first data row (row 2).
 * Column headers from row 1.
 */
const XLSX = require('xlsx');
const path = require('path');

const defaultPath = path.join(__dirname, '..', 'data', 'e2e-input.xlsx');

function readExcelData(filePath = defaultPath) {
  const wb = XLSX.readFile(filePath);
  const out = {};
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length < 2) {
      out[sheetName] = {};
      continue;
    }
    const headers = rows[0].map(h => (h != null ? String(h).trim() : ''));
    const values = rows[1];
    const row = {};
    headers.forEach((h, i) => {
      if (h) row[h] = values[i] != null ? values[i] : '';
    });
    out[sheetName] = row;
  }
  return out;
}

function getStr(row, key) {
  const v = row[key];
  return v != null ? String(v).trim() : '';
}

function getNum(row, key) {
  const v = row[key];
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function isYes(row, key) {
  const v = getStr(row, key).toUpperCase();
  return v === 'Y' || v === 'YES' || v === '1' || v === 'TRUE';
}

module.exports = { readExcelData, getStr, getNum, isYes };
