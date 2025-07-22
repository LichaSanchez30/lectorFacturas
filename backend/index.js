// // backend/index.js (Corregido CUIT y monto total para Facturas A y C)
// const express = require('express');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const pdfParse = require('pdf-parse');
// const XLSX = require('xlsx');
// const cors = require('cors');

// const app = express();
// const PORT = 5000;

// app.use(cors());

// const uploadsDir = path.join(__dirname, 'uploads');
// const outputDir = path.join(__dirname, 'output');
// if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
// if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => cb(null, uploadsDir),
//   filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
// });
// const upload = multer({ storage });

// function parseMonto(monto) {
//   if (!monto) return 0;
//   const n = parseFloat(monto.replace(/\./g, '').replace(',', '.'));
//   return isNaN(n) ? 0 : n;
// }

// function getTextoOriginal(text) {
//   const bloques = text.split(/Fecha de Emisi[óo]n:/);
//   for (let b of bloques) {
//     if (b.includes("ORIGINAL")) return "Fecha de Emisión:" + b;
//   }
//   return text;
// }

// function extractData(text) {
//   text = getTextoOriginal(text);

//   const fechaEmision = text.match(/Fecha[\s\S]*?Emisi[óo]n[:]*[\s\S]*?(\d{2}\/\d{2}\/\d{4})/)?.[1] || 'No encontrada';
//   const periodos = text.match(/Per[íi]odo Facturado Desde[:\s\S]*?Hasta[:\s\S]*?Fecha de Vto\. para el pago[:\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*?(\d{2}\/\d{2}\/\d{4})/);
//   const periodoDesde = periodos?.[1] || 'No encontrado';
//   const periodoHasta = periodos?.[2] || 'No encontrado';
//   const fechaVtoPago = periodos?.[3] || 'No encontrada';

//   // === CUIT robusto (emisor) ===
//   let cuit = text.match(/CUIT\s*[:]*\s*(\d{2}-?\d{8}-?\d)/)?.[1];
//   if (!cuit) {
//     const allCUITs = [...text.matchAll(/\b(\d{2}-?\d{8}-?\d)\b/g)].map(m => m[1]);
//     if (allCUITs.length >= 1) cuit = allCUITs[0];
//     else cuit = 'No encontrado';
//   }

//   const lineas = text.split('\n').map(l => l.trim());
//   const indexLineaPto = lineas.findIndex(l => l.toLowerCase().includes('punto') && l.toLowerCase().includes('comp'));
//   let puntoVenta = 'No encontrado';
//   let nroComprobante = 'No encontrado';
//   if (indexLineaPto !== -1 && lineas[indexLineaPto + 1]) {
//     const bloqueNumerico = lineas[indexLineaPto + 1].replace(/[^\d]/g, '');
//     if (bloqueNumerico.length >= 8) {
//       puntoVenta = bloqueNumerico.slice(0, 5);
//       nroComprobante = bloqueNumerico.slice(5);
//     }
//   }
//   const numeroFactura = `${puntoVenta}-${nroComprobante}`;
//   const tipoFactura = text.match(/FACTURA\s*([ABC])/i)?.[1].toUpperCase() || 'No encontrada';

//   // === Monto Total (más flexible para factura C) ===
//   let montoTotal = 0;
//   const matchTotal = text.match(/Importe Total[^\d]*(\d{1,3}(?:[\.\d]{0,10})?,\d{2})/);
//   if (matchTotal) {
//     montoTotal = parseMonto(matchTotal[1]);
//   } else {
//     // Buscar números luego de la palabra Subtotal
//     const matchSub = text.match(/Subtotal[^\d]*(\d{1,3}(?:[\.\d]{0,10})?,\d{2})/);
//     if (matchSub) {
//       montoTotal = parseMonto(matchSub[1]);
//     } else {
//       // Buscar último número decimal como fallback
//       const matchNum = [...text.matchAll(/(\d{1,3}(?:[\.\d]{0,10})?,\d{2})/g)].map(m => m[1]);
//       if (matchNum.length > 0) {
//         montoTotal = parseMonto(matchNum[matchNum.length - 1]);
//       }
//     }
//   }

//   const cae = text.match(/CAE\s*(N[°º]|:)?\s*(\d{14})/)?.[2] || text.match(/Comprobante Autorizado[\s\S]*?(\d{14})/)?.[1] || 'No encontrado';
//   const fechaVtoCae = text.match(/Comprobante Autorizado[\s\S]*?(\d{2}\/\d{2}\/\d{4})/)?.[1] || 'No encontrada';

//   return {
//     fechaEmision,
//     tipoFactura,
//     numeroFactura,
//     cuit,
//     montoTotal,
//     cae,
//     fechaVtoCae
//   };
// }

// app.post('/upload', upload.array('pdfs'), async (req, res) => {
//   const files = req.files;
//   const results = [];
//   if (!files || files.length === 0) {
//     return res.status(400).json({ message: 'No se recibieron archivos.' });
//   }
//   for (const file of files) {
//     try {
//       const data = await pdfParse(fs.readFileSync(path.join(uploadsDir, file.filename)));
//       const extracted = extractData(data.text);
//       console.log(`✅ Procesado: ${file.originalname}`);
//       results.push({ archivo: file.originalname, ...extracted });
//     } catch (err) {
//       console.error(`❌ Error procesando ${file.originalname}:`, err);
//     }
//   }
//   const wb = XLSX.utils.book_new();
//   const ws = XLSX.utils.json_to_sheet(results);
//   XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
//   const outputPath = path.join(outputDir, 'Facturas_Procesadas.xlsx');
//   XLSX.writeFile(wb, outputPath);
//   res.json({ message: 'Proceso terminado', excel: '/download' });
// });

// app.get('/download', (req, res) => {
//   res.download(path.join(outputDir, 'Facturas_Procesadas.xlsx'));
// });

// app.listen(PORT, () => {
//   console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
// });

// app.get('/', (req, res) => {
//   res.send('🧾 Lector de Facturas Backend está activo.');
// });


const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});
const upload = multer({ storage });

function parseMonto(monto) {
  if (!monto) return 0;
  const n = parseFloat(monto.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function getTextoOriginal(text) {
  const bloques = text.split(/Fecha de Emisi[óo]n:/);
  for (let b of bloques) {
    if (b.includes("ORIGINAL")) return "Fecha de Emisión:" + b;
  }
  return text;
}

function extractData(text) {
  text = getTextoOriginal(text);

  const fechaEmision = text.match(/Fecha[\s\S]*?Emisi[óo]n[:]*[\s\S]*?(\d{2}\/\d{2}\/\d{4})/)?.[1] || 'No encontrada';
  const periodos = text.match(/Per[íi]odo Facturado Desde[:\s\S]*?Hasta[:\s\S]*?Fecha de Vto\. para el pago[:\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*?(\d{2}\/\d{2}\/\d{4})[\s\S]*?(\d{2}\/\d{2}\/\d{4})/);
  const periodoDesde = periodos?.[1] || 'No encontrado';
  const periodoHasta = periodos?.[2] || 'No encontrado';
  const fechaVtoPago = periodos?.[3] || 'No encontrada';

  let cuit = text.match(/CUIT\s*[:]*\s*(\d{2}-?\d{8}-?\d)/)?.[1];
  if (!cuit) {
    const allCUITs = [...text.matchAll(/\b(\d{2}-?\d{8}-?\d)\b/g)].map(m => m[1]);
    if (allCUITs.length >= 1) cuit = allCUITs[0];
    else cuit = 'No encontrado';
  }

  const lineas = text.split('\n').map(l => l.trim());
  const indexLineaPto = lineas.findIndex(l => l.toLowerCase().includes('punto') && l.toLowerCase().includes('comp'));
  let puntoVenta = 'No encontrado';
  let nroComprobante = 'No encontrado';
  if (indexLineaPto !== -1 && lineas[indexLineaPto + 1]) {
    const bloqueNumerico = lineas[indexLineaPto + 1].replace(/[^\d]/g, '');
    if (bloqueNumerico.length >= 8) {
      puntoVenta = bloqueNumerico.slice(0, 5);
      nroComprobante = bloqueNumerico.slice(5);
    }
  }
  const numeroFactura = `${puntoVenta}-${nroComprobante}`;
  const tipoFactura = text.match(/FACTURA\s*([ABC])/i)?.[1].toUpperCase() || 'No encontrada';

  let montoTotal = 0;
  const matchTotal = text.match(/Importe Total[^\d]*(\d{1,3}(?:[\.\d]{0,10})?,\d{2})/);
  if (matchTotal) {
    montoTotal = parseMonto(matchTotal[1]);
  } else {
    const matchSub = text.match(/Subtotal[^\d]*(\d{1,3}(?:[\.\d]{0,10})?,\d{2})/);
    if (matchSub) {
      montoTotal = parseMonto(matchSub[1]);
    } else {
      const matchNum = [...text.matchAll(/(\d{1,3}(?:[\.\d]{0,10})?,\d{2})/g)].map(m => m[1]);
      if (matchNum.length > 0) {
        montoTotal = parseMonto(matchNum[matchNum.length - 1]);
      }
    }
  }

  const cae = text.match(/CAE\s*(N[°º]|:)?\s*(\d{14})/)?.[2] || text.match(/Comprobante Autorizado[\s\S]*?(\d{14})/)?.[1] || 'No encontrado';
  const fechaVtoCae = text.match(/Comprobante Autorizado[\s\S]*?(\d{2}\/\d{2}\/\d{4})/)?.[1] || 'No encontrada';

  return {
    tipoFactura,
    fechaEmision,
    periodoDesde,
    periodoHasta,
    fechaVtoPago,
    numeroFactura,
    cuit,
    montoTotal,
    cae,
    fechaVtoCae
  };
}

app.get('/', (req, res) => {
  res.send('Lector de Facturas Backend está activo.');
});

app.post('/upload', upload.array('pdfs'), async (req, res) => {
  const files = req.files;
  const results = [];
  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'No se recibieron archivos.' });
  }
  for (const file of files) {
    try {
      const data = await pdfParse(fs.readFileSync(path.join(uploadsDir, file.filename)));
      const extracted = extractData(data.text);
      console.log(`✅ Procesado: ${file.originalname}`);
      results.push({ archivo: file.originalname, ...extracted });
    } catch (err) {
      console.error(`❌ Error procesando ${file.originalname}:`, err);
    }
  }
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(results);
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
  const outputPath = path.join(outputDir, 'Facturas_Procesadas.xlsx');
  XLSX.writeFile(wb, outputPath);
  res.json({ message: 'Proceso terminado', excel: '/download' });
});

app.get('/download', (req, res) => {
  res.download(path.join(outputDir, 'Facturas_Procesadas.xlsx'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});