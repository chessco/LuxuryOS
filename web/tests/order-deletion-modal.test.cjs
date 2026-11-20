const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const orderDetail = fs.readFileSync(path.join(root, 'src/pages/OrderDetail.tsx'), 'utf8');
const orders = fs.readFileSync(path.join(root, 'src/pages/Orders.tsx'), 'utf8');
const ordersTable = fs.readFileSync(path.join(root, 'src/components/orders/OrdersTable.tsx'), 'utf8');
const deleteModal = fs.readFileSync(path.join(root, 'src/components/orders/DeleteOrderModal.tsx'), 'utf8');

test('order deletion uses an accessible HTML modal and avoids iOS-breaking window.prompt', () => {
  // DeleteOrderModal component exists and requires reason
  assert.match(deleteModal, /Motivo de eliminación \(obligatorio\)/);
  assert.match(deleteModal, /OrdersService\.deleteOrder/);

  // OrderDetail uses DeleteOrderModal and does not use window.prompt for deletion
  assert.match(orderDetail, /<DeleteOrderModal/);
  assert.doesNotMatch(orderDetail, /handleDeleteOrder[\s\S]*?window\.prompt/);

  // Orders Kanban board uses DeleteOrderModal and does not use window.prompt
  assert.match(orders, /<DeleteOrderModal/);
  assert.doesNotMatch(orders, /handleDeleteOrder[\s\S]*?window\.prompt/);

  // OrdersTable list uses DeleteOrderModal and does not use window.prompt
  assert.match(ordersTable, /<DeleteOrderModal/);
  assert.doesNotMatch(ordersTable, /window\.prompt/);
});
