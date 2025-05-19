
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const upload = multer();
app.use(cors());

function extractField(text, field) {
  const patterns = {
    zeichnungsnummer: /(Artikel-?Nr\.?|Zeichnungsnummer)[^\d]{0,10}(\d{5,})/,
    material: /(Werkstoff|Material)[^\n\r]{0,40}(1\.[0-9]{4}|[A-Z0-9]{3,}[ ]?[A-Z0-9]*)/,
    gewicht: /(Gewicht)[^\d]{0,10}([0-9]+[\.,]?[0-9]*) ?(kg|g)?/,
    masse: /([Ø∅⌀]?[ ]?[0-9]{1,3}[\.,]?[0-9]{0,2}) ?[×xX*] ?([0-9]{1,4}) ?(mm)?/
  };

  const match = text.match(patterns[field]);
  return match ? match[2] || match[1] : "-";
}

app.post("/analyze", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Keine Datei erhalten." });

  console.log("📥 Empfange PDF:", req.file.originalname);

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

    console.log("🧠 Text erhalten, beginne Extraktion...");

    const zeichnungsnummer = extractField(text, "zeichnungsnummer");
    const material = extractField(text, "material");
    const gewicht = extractField(text, "gewicht");
    const masse = extractField(text, "masse");

    let gewichtKg = parseFloat(gewicht.replace(",", "."));
    if (!gewichtKg || gewichtKg > 50) gewichtKg = 0.1;

    const rüst = 60, prog = 60, satz = 35, marge = 1.15;
    const laufzeit = Math.max(1, Math.round(gewichtKg * 5));
    const stückkosten = (rüst + prog + laufzeit * satz) * marge;

    function preis(n) {
      const fix = (rüst + prog) / n;
      return ((fix + laufzeit * satz) * marge).toFixed(2);
    }

    res.json({
      zeichnungsnummer,
      material,
      gewicht: gewichtKg + " kg",
      masse,
      preis1: preis(1),
      preis10: preis(10),
      preis25: preis(25),
      preis50: preis(50),
      preis100: preis(100)
    });

  } catch (err) {
    console.error("❌ Fehler bei Analyse:", err.message);
    res.status(500).json({ error: "Fehler bei Analyse: " + err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("🟢 V10-Semantik-Backend läuft auf Port", PORT));
