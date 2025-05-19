
const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
const upload = multer();
app.use(cors());

app.post("/analyze", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Keine Datei empfangen." });

  try {
    const ocrResponse = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: process.env.OCR_API_KEY
      },
      body: new URLSearchParams({
        base64Image: "data:application/pdf;base64," + req.file.buffer.toString("base64"),
        isOverlayRequired: "false",
        language: "ger"
      })
    });

    const result = await ocrResponse.json();
    const parsedText = result?.ParsedResults?.[0]?.ParsedText || "";

    if (!parsedText) return res.status(200).json({ error: "Kein Text erkannt." });

    // Einfache Extraktion für Demo
    const material = parsedText.match(/1\.?\d{3}/)?.[0] || "Unbekannt";
    const zeichnungsnummer = parsedText.match(/A\d{6}/)?.[0] || "Unbekannt";
    const masse = parsedText.match(/\d+[,\.]?\d*\s?[xX]\s?\d+[,\.]?\d*/) || ["Unbekannt"];
    const gewicht = 0.1; // Beispielwert

    // Preisformel
    const ruest = 60;
    const prog = 60;
    const cncZeit = 10; // Minuten
    const stundenpreis = 35;
    const einzelpreis = (ruest + prog + (cncZeit / 60) * stundenpreis + gewicht * 7) * 1.15;

    const staffel = [1, 10, 25, 50, 100].reduce((acc, m) => {
      const anteilFix = (ruest + prog) / m;
      const variable = ((cncZeit / 60) * stundenpreis + gewicht * 7);
      acc[m] = ((anteilFix + variable) * 1.15).toFixed(2);
      return acc;
    }, {});

    res.json({
      zeichnungsnummer,
      material,
      masse: masse[0],
      gewicht,
      preis: staffel
    });
  } catch (e) {
    res.status(500).json({ error: "Analysefehler: " + e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("📦 Echtbetrieb OCR.space läuft auf Port " + PORT);
});
