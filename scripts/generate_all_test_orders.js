const https = require('https');

async function req(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const req = https.request('https://luxury-api.pitayacode.io' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(buf) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: buf });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // 1. Login as ventas1
  const loginRes = await req('/auth/login', 'POST', { email: 'ventas1', password: 'cared123' });
  if (!loginRes.body?.access_token) {
    console.error('Login failed:', loginRes);
    return;
  }
  const token = loginRes.body.access_token;
  console.log('✓ Logged in as ventas1:', loginRes.body.user.email);

  const clientId = 'f078de4d-0204-4e3e-86d8-f7bf9a746e32'; // Francisco Garcia (6442221844)

  const testOrders = [
    {
      type: 'REPAIR',
      item: 'ANILLO DE ORO',
      metal: 'ORO',
      karats: '14K',
      color: 'AMARILLO',
      weight: '4.5',
      size: '7',
      thickness: '2mm',
      notes: 'Ajuste de medida de 6 a 7 y pulido espejo',
      value: 650,
      cost: 200
    },
    {
      type: 'MANUFACTURE',
      item: 'ANILLO SOLITARIO',
      metal: 'PLATINO',
      karats: '950',
      color: 'BLANCO',
      weight: '6.2',
      size: '6.5',
      thickness: '2.5mm',
      notes: 'Fabricacion personalizada con montura 4 unas',
      value: 18500,
      cost: 9000
    },
    {
      type: 'DESIGN',
      item: 'DIJE MONOGRAMA 3D',
      metal: 'ORO',
      karats: '18K',
      color: 'ROSA',
      weight: '8.0',
      size: 'MEDIANO',
      thickness: '3mm',
      notes: 'Modelado CAD 3D y render para aprobacion',
      value: 2800,
      cost: 1000
    },
    {
      type: 'LASER',
      item: 'ESCLAVA DE ORO',
      metal: 'ORO',
      karats: '10K',
      color: 'AMARILLO',
      weight: '12.5',
      size: '18cm',
      thickness: '4mm',
      notes: 'Grabado laser con tipografia cursiva elegante',
      value: 450,
      cost: 100
    },
    {
      type: 'LAYAWAY',
      item: 'CADENA TEJIDO CUBANO',
      metal: 'ORO',
      karats: '14K',
      color: 'AMARILLO',
      weight: '35.0',
      size: '55cm',
      thickness: '6mm',
      notes: 'Apartado por 60 dias plan quincenal',
      value: 42000,
      cost: 28000
    }
  ];

  for (const t of testOrders) {
    const uppercaseItems = [{
      item: t.item,
      metal: t.metal,
      karats: t.karats,
      color: t.color,
      weight: t.weight,
      size: t.size,
      thickness: t.thickness,
      description: t.notes,
      notes: t.notes
    }];

    const payload = {
      pieceType: t.item,
      value: t.value,
      cost: t.cost,
      totalAmount: t.value,
      margin: t.value - t.cost,
      priority: 'ALTA',
      clientId: clientId,
      type: t.type,
      stage: t.type === 'LAYAWAY' ? 'APROBADO_ANTICIPO' : 'RECEIVED',
      status: t.type === 'LAYAWAY' ? 'LAYAWAY_OPEN' : 'RECEIVED',
      metal: t.metal,
      color: t.color,
      karats: t.karats,
      weight: t.weight,
      size: t.size,
      thickness: t.thickness,
      laborCost: t.value,
      materialCost: t.cost,
      notes: t.notes,
      specifications: {
        items: uppercaseItems,
        department: 'CARED'
      }
    };

    console.log(`\nCreando orden tipo ${t.type} (${t.item})...`);
    const res = await req('/kanban/orders', 'POST', payload, token);
    if (res.status === 201) {
      console.log(`✓ Orden ${t.type} creada con éxito: ID ${res.body.id} (${res.body.orderCode || res.body.id.substring(0, 8)})`);
      // Send WhatsApp notification
      const waRes = await req(`/kanban/orders/${res.body.id}/send-whatsapp`, 'POST', {}, token);
      console.log(`  -> WhatsApp enviado a Francisco Garcia (6442221844):`, waRes.body);
    } else {
      console.error(`✗ Error creando orden ${t.type}:`, res.status, res.body);
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n--- Pruebas de todas las órdenes completadas ---');
})();
