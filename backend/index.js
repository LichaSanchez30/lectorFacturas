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

// Multer config: renombrar archivos sin espacios raros
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
  // === Fecha de Emisión ===
  const fechaEmision = text.match(/Fecha[\s\S]*?Emisi[oó]n[:]*[\s\S]*?(\d{2}\/\d{2}\/\d{4})/)?.[1] || 'No encontrada';

  // === Período Facturado ===
  const periodos = text.match(/Período Facturado Desde[:\s\S]*?Hasta[:\s\S]*?Fecha de Vto\. para el pago[:\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*?(\d{2}\/\d{2}\/\d{4})/);
  const periodoDesde = periodos?.[1] || 'No encontrado';
  const periodoHasta = periodos?.[2] || 'No encontrado';
  const fechaVtoPago = periodos?.[3] || 'No encontrada';

  // === CUIT ===
  const cuit = text.match(/\b(\d{2}-?\d{8}-?\d)\b/)?.[1] || text.match(/\b(\d{11})\b/)?.[1] || 'No encontrado';

  // === Punto de Venta y Comp. Nro ===
//   const facturaMatch = text.match(/Punto[\s\S]*?Venta[:]*[\s\S]*?(\d{5})[\s\S]*?Comp\.?[\s\S]*?Nro[:]*[\s\S]*?(\d{8})/i);
//   console.log('\n=== FACTURA MATCH ===\n', facturaMatch);

//   const puntoVenta = facturaMatch?.[1]?.replace(/[^\d]/g, '').trim() || 'No encontrado';
//   const nroComprobante = facturaMatch?.[2]?.replace(/[^\d]/g, '').trim() || 'No encontrado';
//   const numeroFactura = `${puntoVenta}-${nroComprobante}`;

// === Punto de Venta y Comp. Nro versión quirúrgica ===
const lineaFactura = text.match(/Punto[\s\S]*?Venta[:]*[\s\S]*?(\d{5}[\s\S]*?Comp\.?[\s\S]*?Nro[:]*[\s\S]*?\d{5,})/i);

console.log('\n=== LINEA FACTURA ===\n', lineaFactura);

let puntoVenta = 'No encontrado';
let nroComprobante = 'No encontrado';

if (lineaFactura && lineaFactura[1]) {
  puntoVenta = lineaFactura[1].match(/(\d{5})/)?.[1] || 'No encontrado';
  nroComprobante = lineaFactura[1].match(/Nro[:]*[\s\S]*?(\d{6,9})/)?.[1] || 'No encontrado';
}

puntoVenta = puntoVenta.replace(/[^\d]/g, '').trim();
nroComprobante = nroComprobante.replace(/[^\d]/g, '').trim();

const numeroFactura = `${puntoVenta}-${nroComprobante}`;

  // === CAE robusto ===
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

      // DEBUG: ver primeros caracteres del texto
      console.log('\n===== TEXTO EXTRAÍDO =====\n');
      console.log(data.text.slice(0, 500));

      const extracted = extractData(data.text);
      console.log(`✅ Procesado: ${file.filename}`);
      results.push({ archivo: file.originalname, ...extracted });

    } catch (err) {
      console.error(`❌ Error procesando ${file.filename}:`, err);
    }
  }

  // Crear Excel
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

// === Iniciar servidor ===
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});
