const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rootDir = path.resolve(__dirname, '../..');
const clientsServiceSource = fs.readFileSync(
  path.join(rootDir, 'web/src/services/clients.service.ts'),
  'utf8',
);
const clientsPageSource = fs.readFileSync(
  path.join(rootDir, 'web/src/pages/Clients.tsx'),
  'utf8',
);
const ordersPageSource = fs.readFileSync(
  path.join(rootDir, 'web/src/pages/Orders.tsx'),
  'utf8',
);

test('clients.service.ts preserves RETAIL backward compatibility alongside VIP/RESELLER & portalAccess', () => {
  assert.match(clientsServiceSource, /export type ClientType = 'RETAIL' \| 'VIP' \| 'RESELLER'/);
  assert.match(clientsServiceSource, /portalAccess\?: ClientPortalAccessDto/);
  assert.match(
    clientsServiceSource,
    /const clientType: ClientType =\s*c\.type === 'RESELLER' \|\| c\.type === 'VIP' \? c\.type : 'RETAIL'/,
  );
  assert.match(clientsServiceSource, /enabled: false/);
});

test('Clients.tsx exposes segment tabs, CSV export columns, and admin-only portal provisioning controls', () => {
  assert.match(clientsPageSource, /segmentFilter/);
  assert.match(clientsPageSource, /Clientes Finales/);
  assert.match(clientsPageSource, /Revendedores/);
  assert.match(clientsPageSource, /'Tipo de Cliente'/);
  assert.match(clientsPageSource, /'Usuario Portal'/);
  assert.match(clientsPageSource, /Acceso al Portal de Revendedores \(POS\)/);
  assert.match(clientsPageSource, /if \(isAdmin\) \{/);
  assert.match(clientsPageSource, /suggestPortalUsername/);
});

test('Orders.tsx retains AGENTS.md dual piece photography and mandatory jeweler guards', () => {
  assert.match(ordersPageSource, /CameraCaptureModal/);
  assert.match(ordersPageSource, /capture="environment"/);
  assert.match(ordersPageSource, /compressImageFile/);
  assert.match(ordersPageSource, /id="assigned-jeweler"/);
  assert.match(ordersPageSource, /failValidation\('Selecciona un Joyero antes de registrar la orden\.', 'assigned-jeweler'\)/);
});

test('Orders.tsx requires both client and 10-digit client phone when creating orders', () => {
  assert.match(ordersPageSource, /Selecciona o registra el cliente antes de continuar\./);
  assert.match(
    ordersPageSource,
    /El teléfono del cliente es obligatorio \(mínimo 10 dígitos\) para registrar la orden\./,
  );
  assert.doesNotMatch(ordersPageSource, /Teléfono \(Opcional\)/);
  assert.match(ordersPageSource, /id="new-client-phone"/);
});

test('Orders.tsx requires mandatory ¿Dejó Oro? selection with multi-entry karats (with Otro) and grams', () => {
  assert.match(ordersPageSource, /¿Dejó Oro\?/);
  assert.match(ordersPageSource, /id="left-gold-section"/);
  assert.match(
    ordersPageSource,
    /Indica si el cliente dejó oro \(Sí o No\) antes de registrar la orden\./,
  );
  assert.match(ordersPageSource, /leftGoldItems/);
  assert.match(ordersPageSource, /Agregar otro kilataje/);
  assert.match(ordersPageSource, /options=\{\['10 K', '14 K', '18 K', '21\.6 K', '24 K'\]\}/);
});
