const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'Inventory.tsx'), 'utf8');

if (source.includes('MOCK_INVENTORY_DATA')) {
  throw new Error('Inventario no debe depender de datos simulados');
}
if (!source.includes('InventoryService.list()')) {
  throw new Error('Inventario debe cargar artículos desde la API');
}
if (!source.includes('InventoryService.create(')) {
  throw new Error('Nuevo artículo debe persistirse mediante la API');
}
if (!source.includes('Nuevo Artículo')) {
  throw new Error('La acción de alta debe identificarse como Nuevo Artículo');
}
if (source.includes('handleDelete')) {
  throw new Error('No mostrar eliminación simulada sin una operación auditada en API');
}

console.log('inventory-management contract passed');
