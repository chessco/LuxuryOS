const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.resolve(__dirname, '../..');
const posSalesSource = fs.readFileSync(path.join(rootDir, 'web/src/pages/PosSales.tsx'), 'utf8');
const resellerAppSource = fs.readFileSync(path.join(rootDir, 'reseller-web/src/App.tsx'), 'utf8');
const resellerTypesSource = fs.readFileSync(path.join(rootDir, 'reseller-web/src/types.ts'), 'utf8');
const resellerCssSource = fs.readFileSync(path.join(rootDir, 'reseller-web/src/styles.css'), 'utf8');
const labelModalSource = fs.readFileSync(
  path.join(rootDir, 'web/src/components/orders/LabelPrintModal.tsx'),
  'utf8',
);

test('Caja POS exposes dual credit workspace, 4 settlement modes, and idempotent repayments', () => {
  assert.match(posSalesSource, /Órdenes de Venta/);
  assert.match(posSalesSource, /Crédito y Cartera \(30d\)/);
  assert.match(posSalesSource, /REVOLVING/);
  assert.match(posSalesSource, /NON_REVOLVING/);
  assert.match(posSalesSource, /MIXED/);
  assert.match(posSalesSource, /\/commerce\/credit\/obligations/);
  assert.match(posSalesSource, /\/commerce\/credit\/accounts/);
  assert.match(posSalesSource, /\/commerce\/credit\/subject-summary/);
  assert.match(posSalesSource, /allowOverdueOverride/);
  assert.match(posSalesSource, /Idempotency-Key/);
});

test('Portal Revendedores renders read-only Mi crédito view preserving Cared palette', () => {
  assert.match(resellerAppSource, /#credito/);
  assert.match(resellerAppSource, /Mi crédito/);
  assert.match(resellerAppSource, /getResellerCredit/);
  assert.match(resellerAppSource, /revolvingObligations/);
  assert.match(resellerAppSource, /nonRevolvingObligations/);
  assert.match(resellerTypesSource, /REVOLVING/);
  assert.match(resellerTypesSource, /NON_REVOLVING/);
  assert.doesNotMatch(resellerCssSource, /#FFD700|#EAB308|#FACC15|gold/i);
});

test('AirPrint label modal remains intact', () => {
  assert.match(labelModalSource, /html2canvas/);
  assert.match(labelModalSource, /jsPDF/);
});
