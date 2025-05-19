const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });
app.use(cors());
app.use(express.json());

const API_KEY = "K81799995088957"; // OCR.space API-Key

app.post('/analyze', upload.single('file'), async (req, res) => {
    try {
        const filePath = req.file.path;

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('OCREngine', '2');
        formData.append('scale', 'true');

        const response = await fetch("https://api.ocr.space/parse/image", {
            method: 'POST',
            headers: { apikey: API_KEY },
            body: formData
        });

        const result = await response.json();
        fs.unlinkSync(filePath); // Datei löschen nach Analyse

        const parsedText = result.ParsedResults?.[0]?.ParsedText || "";

        // Einfache Extraktion – später durch KI ersetzen
        const materialMatch = parsedText.match(/1\.[0-9]+\s?[A-Za-z0-9\s]+/);
        const weightMatch = parsedText.match(/Gewicht\s*([0-9\.,]+)\s*kg/i);
        const numberMatch = parsedText.match(/Artikel-Nr\.?[:\s]*([A-Z0-9]+)/i);

        const material = materialMatch ? materialMatch[0] : "-";
        const weight = weightMatch ? parseFloat(weightMatch[1].replace(",", ".")) : 0.1;
        const drawingNumber = numberMatch ? numberMatch[1] : "Unbekannt";

        const baseCost = 60 + 30 + (weight * 35); // Rüst + Programmierung + Fertigung
        const margin = 1.15;
        const finalPrice = baseCost * margin;

        const prices = [1, 10, 25, 50, 100].map(qty => ({
            qty,
            price: (finalPrice / Math.pow(qty, 0.35)).toFixed(2)
        }));

        res.json({
            zeichnungsnummer: drawingNumber,
            material,
            gewicht: weight + " kg",
            staffelpreise: prices
        });
    } catch (err) {
        res.status(500).json({ error: "Analysefehler: " + err.message });
    }
});

app.listen(10000, () => {
    console.log("✅ Starkspan V12 Backend läuft auf Port 10000");
});