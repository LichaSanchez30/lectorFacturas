import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [files, setFiles] = useState(null);
  const [status, setStatus] = useState('');

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!files) {
      alert('Selecciona archivos PDF primero.');
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('pdfs', files[i]);
    }

    setStatus('Subiendo y procesando...');

    try {
      await axios.post('http://localhost:5000/upload', formData);
      setStatus('✅ Procesado correctamente. Descargá el Excel abajo.');
    } catch (err) {
      console.error(err);
      setStatus('❌ Error al subir o procesar.');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>📄 Lector de Facturas PDF → Excel</h2>
      <input type="file" multiple accept="application/pdf" onChange={handleFileChange} />
      <br /><br />
      <button onClick={handleUpload}>Subir y Procesar</button>
      <p>{status}</p>
      {status.includes('✅') && (
        <a href="http://localhost:5000/download" download>📥 Descargar Excel</a>
      )}
    </div>
  );
}

export default App;
