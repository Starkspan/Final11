const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors());
app.use(express.static('public'));

app.post('/analyze', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;

    const formData = new FormData();
    formData.append('apikey', 'K81799995088957');
    formData.append('file', fs.createReadStream(filePath));
    formData.append('language', 'eng');
    formData.append('OCREngine', '2');

    const ocrRes = await axios.post('https://api.ocr.space/parse/image', formData, {
      headers: formData.getHeaders(),
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    fs.unlinkSync(filePath); // Temp-Datei löschen

    const parsed = ocrRes.data?.ParsedResults?.[0]?.ParsedText || '';
    res.json({ text: parsed });

  } catch (err) {
    res.status(500).json({ error: 'Analysefehler', details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log('OCR.space Proxy läuft auf Port', PORT);
});