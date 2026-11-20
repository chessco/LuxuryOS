const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const webRoot = path.resolve(__dirname, '..');
const files = [
  'src/components/orders/ClientWhatsAppModal.tsx',
  'src/pages/Messages.tsx',
];

test('oculta indicadores visuales de entrega de WhatsApp', () => {
  for (const relativePath of files) {
    const source = fs.readFileSync(path.join(webRoot, relativePath), 'utf8');
    assert.doesNotMatch(source, /getDeliveryIndicator/);
    assert.doesNotMatch(source, /Significado de los estados de WhatsApp/);
  }
});
