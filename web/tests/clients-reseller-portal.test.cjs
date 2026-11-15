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
