
const express = require('express');
const fileUpload = require('express-fileupload');
const fs = require('fs');
const { createWorker } = require('tesseract.js');

const app = express();
app.use(fileUpload());

const materialDB = require('./material_db_v13_extended.json');

function detectMaterialFromOCR(ocrText, db) {
  const lines = ocrText.toLowerCase().split(/\r?\n/);
  const materialKeywords = ["werkstoff", "material", "halbzeug", "werkstoff/halbzeug", "mat."];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (materialKeywords.some(k => line.includes(k))) {
      const nextLine = (lines[i + 1] || "") + " " + line;
      for (const material of db) {
        for (const nummer of material.nummern) {
          if (nextLine.includes(nummer.toLowerCase())) {
            return material.name;
          }
        }
      }
    }
  }
  return "-";
}

app.post('/analyze', async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send('No file uploaded.');
  }

  const imageFile = req.files.file;
  const filePath = './temp_image.png';
  await imageFile.mv(filePath);

  const worker = await createWorker('eng');
  await worker.loadLanguage('eng');
  await worker.initialize('eng');
  const { data: { text } } = await worker.recognize(filePath);
  await worker.terminate();

  const material = detectMaterialFromOCR(text, materialDB);

  res.json({
    material,
    ocrText: text
  });
});

app.listen(3000, () => {
  console.log('Backend V13 (robust) läuft auf Port 3000');
});
