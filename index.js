// index.js
// Bot "Jarvis" de JPL Partners para WhatsApp (Twilio) + OpenAI
// Español (Colombia). Incluye "fallback" (respuesta de emergencia) si OpenAI no tiene saldo.

import express from "express";
import fetch from "node-fetch";
import { twiml as TwiML } from "twilio";

const app = express();
app.use(express.urlencoded({ extended: false }));

// Lee la clave de OpenAI desde Render → Environment → OPENAI_API_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ---- Utilidad: pedir a OpenAI con timeout corto ----
async function askOpenAI(userText) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000); // 8 seg máx
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // económico + bueno
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `Eres Jarvis, asesor contable profesional de JPL Partners (Colombia).
Hablas en español (Colombia). Ayudas en contabilidad, impuestos, nómina y reportes.
Sé cordial, claro y breve; ofrece pasos concretos y si falta info, pide lo mínimo.`,
          },
          { role: "user", content: userText || "Hola" },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!r.ok) {
      const t = await r.text();
      console.error("OpenAI error:", t);
      return null; // hará que caiga al fallback
    }
    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    return answer || null;
  } catch (err) {
    console.error("OpenAI timeout/error:", err?.message || err);
    return null; // hará que caiga al fallback
  }
}

// ---- Webhook para Twilio ----
app.post("/webhook", async (req, res) => {
  const from = req.body.From || "";
  const body = (req.body.Body || "").trim();
  console.log("Inbound from Twilio:", { from, body });

  // 1) Intentar con OpenAI
  let text = await askOpenAI(body);

  // 2) Si OpenAI no responde (sin saldo o error), usar fallback amigable
  if (!text) {
    text =
      "¡Gracias por escribir a JPL Partners! En este momento estoy con alta demanda. " +
      "¿Tu consulta es sobre contabilidad, nómina o impuestos? Puedo guiarte paso a paso.";
  }

  // 3) Responder SIEMPRE a Twilio con TwiML
  const twiml = new TwiML.MessagingResponse();
  twiml.message(text);
  res.type("text/xml").status(200).send(twiml.toString());
});

// Puerto para Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));

