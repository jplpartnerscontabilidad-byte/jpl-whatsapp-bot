// index.js (ES Modules)
// Bot "Jarvis" para WhatsApp (Twilio) + OpenAI con fallback si OpenAI falla/sin saldo.

import express from "express";
import fetch from "node-fetch";
import { twiml as TwiML } from "twilio";

const app = express();
app.use(express.urlencoded({ extended: false }));

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function askOpenAI(userText) {
  if (!OPENAI_API_KEY) return null; // si no hay clave, ir directo al fallback

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content:
              "Eres Jarvis, asesor contable profesional de JPL Partners (Colombia). " +
              "Hablas en español (Colombia). Ayudas en contabilidad, impuestos, nómina y reportes. " +
              "Sé cordial, claro y breve; ofrece pasos concretos y si falta info, pide lo mínimo."
          },
          { role: "user", content: userText || "Hola" }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!r.ok) {
      const t = await r.text();
      console.error("OpenAI error:", t);
      return null;
    }

    const data = await r.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    return answer || null;
  } catch (err) {
    console.error("OpenAI timeout/error:", err?.message || err);
    return null;
  }
}

app.post("/webhook", async (req, res) => {
  const from = req.body.From || "";
  const body = (req.body.Body || "").trim();
  console.log("Inbound from Twilio:", { from, body });

  let text = await askOpenAI(body);

  if (!text) {
    text =
      "¡Gracias por escribir a JPL Partners! En este momento estoy con alta demanda. " +
      "¿Tu consulta es sobre contabilidad, nómina o impuestos? Puedo guiarte paso a paso.";
  }

  const twiml = new TwiML.MessagingResponse();
  twiml.message(text);
  res.type("text/xml").status(200).send(twiml.toString());
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor escuchando en puerto ${PORT}`));

