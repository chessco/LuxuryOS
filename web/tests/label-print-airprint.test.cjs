const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'orders', 'LabelPrintModal.tsx'), 'utf8');

if (!source.includes("import('html2canvas')") || !source.includes("import('jspdf')")) {
  throw new Error('AirPrint debe generar un PDF con html2canvas y jsPDF');
}
if (!source.includes('format: [62, pageHeightMm]')) {
  throw new Error('El PDF AirPrint debe usar ancho de 62 mm y altura dinámica');
}
if (source.includes('window.location.assign')) {
  throw new Error('No usar location.assign para abrir la etiqueta en iPad');
}
if (!source.includes('if (!isOpen || !order || isAppleMobileDevice()) return;')) {
  throw new Error('Safari no debe imprimir automáticamente al abrir la etiqueta');
}

console.log('label-print-airprint contract passed');
