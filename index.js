
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const upload = multer();
app.use(cors());

function extract(text, regexList) {
  for (let regex of regexList) {
    const match = text.match(regex);
    if (match) return match[1] || match[0];
  }
  return "-";
}

function gewichtAlsZahl(raw) {
  if (!raw) return 0.1;
  let g = parseFloat(raw.replace(",", "."));
  if (isNaN(g) || g < 0.001 || g > 50) return 0.1;
  return g;
}

app.post("/analyze", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Keine Datei hochgeladen." });

  try {
    const ocr = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: process.env.OCR_API_KEY },
      body: new URLSearchParams({
        base64Image: "data:application/pdf;base64," + req.file.buffer.toString("base64"),
        isOverlayRequired: "false",
        language: "ger"
      }),
      timeout: 20000
    });

    const result = await ocr.json();
    const text = result?.ParsedResults?.[0]?.ParsedText || "";

    const zeichnungsnummer = extract(text, [
      /(Artikel[- ]?Nr\.?\s*[:\-]?\s*)([A-Z0-9\-]{6,})/,
      /(Zeichnungsnummer\s*[:\-]?\s*)([A-Z0-9\-]{6,})/,
      /\b([A-Z]?\d{6,})\b/
    ]);

    const material = extract(text, [
      /Werkstoff\s*[:\-]?\s*([A-Z0-9\.\-\s]{4,})/,
      /Material\s*[:\-]?\s*([A-Z0-9\.\-\s]{4,})/,
      /(1\.[0-9]{3})/
    ]);

    const masse = extract(text, [
      /([Ø∅⌀]?[ ]?[0-9]{1,3}[\.,]?[0-9]{0,2}) ?[×xX\*] ?([0-9]{1,4})/,
      /([0-9]{1,3}[.,]?[0-9]{0,2}) ?mm/
    ]);

    const gewicht = extract(text, [
      /Gewicht\s*[:=]?\s*([0-9]+[\.,]?[0-9]*) ?(kg|g)?/,
      /([0-9]{1,3}[\.,]?[0-9]{1,3}) ?kg/
    ]);

    const gKg = gewichtAlsZahl(gewicht);

    const rüst = 60, prog = 60, satz = 35, materialPreis = 7, marge = 1.15;
    const laufzeitMin = Math.round(Math.max(1, gKg * 8));
    const laufzeitKosten = (laufzeitMin / 60) * satz;
    const matKosten = gKg * materialPreis;
    const grundpreis = (rüst + prog + laufzeitKosten + matKosten) * marge;

    const preisStaffel = {};
    [1, 10, 25, 50, 100].forEach(n => {
      const fix = (rüst + prog) / n;
      const gesamt = (fix + laufzeitKosten + matKosten) * marge;
      preisStaffel[n] = gesamt.toFixed(2);
    });

    res.json({
      zeichnungsnummer,
      material,
      masse,
      gewicht: gKg + " kg",
      laufzeit: laufzeitMin + " min",
      preis: preisStaffel
    });

  } catch (err) {
    console.error("❌ Fehler:", err.message);
    res.status(500).json({ error: "Analysefehler: " + err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🟢 V11-Backend aktiv auf Port", PORT));
