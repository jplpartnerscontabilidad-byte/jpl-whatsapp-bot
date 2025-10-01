// index.js
// Jarvis – Bot de JPL Partners (WhatsApp - Twilio + OpenAI)
// Español (Colombia) – tono profesional y cercano

const express = require("express");
const bodyParser = require("body-parser");

// fetch: usa el nativo (Node 18+) y si no, carga node-fetch dinámicamente
const fetch =
  global.fetch ||
  ((...args) => import("node-fetch").then(({ default: f }) => f(...args)));

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// ------- Configuración -------
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Memoria breve por usuario (últimos 6 intercambios)
const memory = new Map();
const MAX_TURNS = 6;

// Prompt de rol del asistente
const SYSTEM_PROMPT = `
Eres "Jarvis", asistente virtual contable de JPL Partners (firma en Colombia).
Hablas español (Colombia), tono profesional y cercano; respuestas claras, breves y útiles.
Tu misión es entender la necesidad del cliente y guiarlo en:
• Contabilidad mensual y cierres
• Impuestos (DIAN), regularizaciones y planeación tributaria
• Nómina y seguridad social
• Facturación electrónica y organización administrativa
• Diagnóstico gratuito y propuesta personalizada

Reglas:
• No des consejos ilegales ni promesas irreales.
• Si piden precios, explica que son personalizados; ofrece agendar una llamada o diagnóstico sin costo.
• Pide datos cuando corresponda (nombre, empresa, ciudad, correo).
• Usa viñetas cuando convenga; evita párrafos muy largos.
• Mantén empatía, proactividad y enfoque consultivo.
`;

// Mensaje de respaldo si algo falla
const FALLBACK_REPLY =
  "¡Hola! Soy Jarvis de JPL Partners. Tuve un inconveniente para procesar tu mensaje. ¿Podrías repetirlo o decirme en qué área contable/tributaria necesitas ayuda?";

// Helpers
function sanitize(text = "", max = 1200) {
  return String(text).replace(/\s+/g, " ").trim().slice(0, max);
}
function twiml(message) {
  return `<Response><Message>${message}</Message></Response>`;
}

// Health checks
app.get("/", (_req, res) => res.status(200).send("OK - Jarvis online"));
app.get("/webhook", (_req, res) =>
  res.status(200).send("OK - /webhook GET. Use POST desde Twilio.")
);

// ------- Webhook principal (Twilio) -------
app.post("/webhook", async (req, res) => {
  try {
    const from = req.body.From || "desconocido";
    const body = sanitize(req.body.Body || "");

    console.log("Inbound from Twilio:", { from, body });

    // Si no hay KEY, responde fallback
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY ausente");
      res.set("Content-Type", "text/xml");
      return res.send(twiml(FALLBACK_REPLY));
    }

    // Recuperar historial
    const history = memory.get(from) || [];

    // Construir mensajes para OpenAI
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: body || "El usuario saludó." }
    ];

    // Llamada a OpenAI Chat Completions
    const oai = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // calidad/costo equilibrado
        temperature: 0.3,     // respuestas profesionales y consistentes
        messages
      })
    });

    const data = await oai.json();

    if (!oai.ok) {
      console.error("OpenAI error:", data);
      res.set("Content-Type", "text/xml");
      return res.send(twiml(FALLBACK_REPLY));
    }

    let reply = sanitize(data?.choices?.[0]?.message?.content || "");
    if (!reply) reply = FALLBACK_REPLY;

    // Actualizar memoria (capar a últimos 6 turnos)
    const updated = [
      ...history,
      { role: "user", content: body },
      { role: "assistant", content: reply }
    ].slice(-MAX_TURNS);
    memory.set(from, updated);

    // Responder a Twilio
    res.set("Content-Type", "text/xml");
    return res.send(twiml(reply));
  } catch (err) {
    console.error("Webhook error:", err);
    res.set("Content-Type", "text/xml");
    return res.send(twiml(FALLBACK_REPLY));
  }
});

app.listen(PORT, () =>
  console.log(`Jarvis corriendo en puerto ${PORT}`)
);
