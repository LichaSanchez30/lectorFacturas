// import React, { useState } from 'react';
// import axios from 'axios';

// function App() {
//   const [files, setFiles] = useState(null);
//   const [status, setStatus] = useState('');

//   const handleFileChange = (e) => {
//     setFiles(e.target.files);
//   };

//   const handleUpload = async () => {
//     if (!files) {
//       alert('Selecciona archivos PDF primero.');
//       return;
//     }

//     const formData = new FormData();
//     for (let i = 0; i < files.length; i++) {
//       formData.append('pdfs', files[i]);
//     }

//     setStatus('Subiendo y procesando...');

//     try {
//       await axios.post('http://localhost:5000/upload', formData);
//       setStatus('✅ Procesado correctamente. Descargá el Excel abajo.');
//     } catch (err) {
//       console.error(err);
//       setStatus('❌ Error al subir o procesar.');
//     }
//   };

//   return (
//     <div style={{ padding: '20px', fontFamily: 'Arial' }}>
//       <h2>📄 Lector de Facturas PDF → Excel</h2>
//       <input type="file" multiple accept="application/pdf" onChange={handleFileChange} />
//       <br /><br />
//       <button onClick={handleUpload}>Subir y Procesar</button>
//       <p>{status}</p>
//       {status.includes('✅') && (
//         <a href="http://localhost:5000/download" download>📥 Descargar Excel</a>
//       )}
//     </div>
//   );
// }

// export default App;



import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [files, setFiles] = useState(null);
  const [status, setStatus] = useState('');

  const backendUrl = 'https://poetic-pika-933595.netlify.app'; // ⚠️ Reemplazá esto con tu URL real

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!files) {
      alert('Seleccioná uno o más archivos PDF.');
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('pdfs', files[i]);
    }

    setStatus('🔄 Subiendo y procesando...');

    try {
      await axios.post(`${backendUrl}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStatus('✅ Procesado correctamente. ¡Descargá el Excel abajo!');
    } catch (err) {
      console.error(err);
      setStatus('❌ Error al subir o procesar los archivos.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial', maxWidth: '600px', margin: 'auto' }}>
      <h2>📄 Lector de Facturas PDF → Excel</h2>
      <input type="file" multiple accept="application/pdf" onChange={handleFileChange} />
      <br /><br />
      <button onClick={handleUpload}>Subir y Procesar</button>
      <p>{status}</p>

      {status.includes('✅') && (
        <a
          href={`${backendUrl}/download`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#4CAF50',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '5px'
          }}
        >
          📥 Descargar Excel
        </a>
      )}
    </div>
  );
}

export default App;