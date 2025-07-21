const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());

// Crear carpetas si no existen
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('📂 Carpeta /uploads creada.');
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
  console.log('📂 Carpeta /output creada.');
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({ storage: storage });

/**
 * Función robusta para extraer datos de la factura
 */
function extractData(text) {
  // === Guarda TODO el texto ===
  fs.writeFileSync(path.join(__dirname, 'texto_extraido.txt'), text, 'utf-8');
  console.log('\n=== Texto PDF guardado como texto_extraido.txt ===');

  // === Fecha de Emisión ===
  const fechaEmision = text.match(/Fecha[\s\S]*?Emisi[oó]n[:]*[\s\S]*?(\d{2}\/\d{2}\/\d{4})/)?.[1] || 'No encontrada';

  // === Período Facturado ===
  const periodos = text.match(/Período Facturado Desde[:\s\S]*?Hasta[:\s\S]*?Fecha de Vto\. para el pago[:\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*?(\d{2}\/\d{2}\/\d{4})/);
  const periodoDesde = periodos?.[1] || 'No encontrado';
  const periodoHasta = periodos?.[2] || 'No encontrado';
  const fechaVtoPago = periodos?.[3] || 'No encontrada';

  // === CUIT ===
  const cuit = text.match(/\b(\d{2}-?\d{8}-?\d)\b/)?.[1] || text.match(/\b(\d{11})\b/)?.[1] || 'No encontrado';

  // === Punto de Venta y Comp. Nro — versión definitiva ===
  const lineas = text.split('\n').map(l => l.trim());
  const indexLineaPto = lineas.findIndex(l => l.toLowerCase().includes('punto') && l.toLowerCase().includes('comp'));

  console.log('\n=== LÍNEA CLAVE ===\n', lineas[indexLineaPto]);

  let puntoVenta = 'No encontrado';
  let nroComprobante = 'No encontrado';

  if (indexLineaPto !== -1 && lineas[indexLineaPto + 1]) {
    const bloqueNumerico = lineas[indexLineaPto + 1].replace(/[^\d]/g, '');
    console.log('\n=== BLOQUE NUMÉRICO DETECTADO ===\n', bloqueNumerico);

    if (bloqueNumerico.length >= 8) {
      puntoVenta = bloqueNumerico.slice(0, 5);
      nroComprobante = bloqueNumerico.slice(5);
    }
  }

  const numeroFactura = `${puntoVenta}-${nroComprobante}`;
  console.log('\n=== RESULTADO FACTURA FINAL ===\n', { puntoVenta, nroComprobante, numeroFactura });

  // === CAE ===
  let cae = text.match(/CAE\s*(N[°º]|:)?\s*(\d{14})/)?.[2];
  if (!cae) {
    cae = text.match(/Comprobante Autorizado[\s\S]*?(\d{14})/)?.[1];
  }
  cae = cae || 'No encontrado';

  // === Fecha Vto. CAE ===
  const fechaVtoCae = text.match(/Comprobante Autorizado[\s\S]*?(\d{2}\/\d{2}\/\d{4})/)?.[1] || 'No encontrada';

  return {
    fechaEmision,
    periodoDesde,
    periodoHasta,
    fechaVtoPago,
    numeroFactura,
    cuit,
    cae,
    fechaVtoCae
  };
}

// === Endpoint principal ===
app.post('/upload', upload.array('pdfs'), async (req, res) => {
  const files = req.files;
  const results = [];

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No se recibieron archivos.' });
  }

  for (const file of files) {
    const filePath = path.join(uploadsDir, file.filename);

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      const extracted = extractData(data.text);
      console.log(`✅ Procesado: ${file.filename}`);
      results.push({ archivo: file.originalname, ...extracted });

    } catch (err) {
      console.error(`❌ Error procesando ${file.filename}:`, err);
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(results);
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');

  const outputPath = path.join(outputDir, 'Facturas_Procesadas.xlsx');
  XLSX.writeFile(wb, outputPath);

  res.json({ message: 'Proceso terminado', excel: '/download' });
});

// === Endpoint para descargar Excel ===
app.get('/download', (req, res) => {
  const file = path.join(outputDir, 'Facturas_Procesadas.xlsx');
  res.download(file);
});

// === Arrancar servidor ===
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
