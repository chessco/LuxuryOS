const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const service = fs.readFileSync(path.join(root, 'src/services/orders.service.ts'), 'utf8');
const orders = fs.readFileSync(path.join(root, 'src/pages/Orders.tsx'), 'utf8');
const modal = fs.readFileSync(path.join(root, 'src/components/orders/DeletedOrdersModal.tsx'), 'utf8');

test('order deletion requires a reason and exposes an admin audit list', () => {
  assert.match(service, /data:\s*\{\s*reason\s*\}/);
  assert.match(service, /\/kanban\/deleted-orders/);
  assert.match(orders, /motivo de eliminaci/);
  assert.match(orders, /DeletedOrdersModal/);
  assert.match(modal, /deletedBy/);
  assert.match(modal, /deletionReason/);
  assert.match(modal, /deletedAt/);
});
