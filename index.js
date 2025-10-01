// index.js
// Bot "Jarvis" de JPL Partners - WhatsApp (Twilio) + OpenAI
// Estilo: asesor contable profesional, español (Colombia)

const express = require("express");
const bodyParser = require("body-parser");

// Si estás en Node 18+ puedes usar fetch nativo; si no, descomenta esta línea:
// const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// ------- Configuración -------
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Memoria breve por usuario (últimos 6 intercambios). Se reinicia al reiniciar el server.
const memory = new Map();
const MAX_TURNS = 6;

// Mensaje de respaldo por si falla la API
const FALLBACK_REPLY =
  "¡Hola! Soy Jarvis de JPL Partners. Tuve un inconveniente para procesar tu mensaje. ¿Podrías repetirlo o decirme en qué área contable/tributaria necesitas ayuda?";

// Prompt de rol del asistente
const SYSTEM_PROMPT = `
Eres "Jarvis", asistente virtual contable de JPL Partners (firma en Colombia).
Hablas español (Colombia), tono profesional y cercano; respuestas claras, breves y útiles.
Objetivo: entender la necesidad del cliente y guiarlo con:
- Contabilidad mensual y cierres
- Impuestos (DIAN), regularizaciones y planeación tributaria
- Nómina y seguridad social
- Facturación electrónica y organización administrativa
- Diagnóstico gratuito y propuesta personalizada

Reglas:
- No des consejos ilegales ni promesas irreales.
- Si piden precios, explica que son personalizados; ofrece agendar llamada/diagnóstico sin costo.
- Pide datos cuando corresponda (nombre, empresa, ciudad, correo).
- Usa viñetas cuando convenga; no escribas párrafos muy largos.
- Mantén empatía, proactividad y enfoque consultivo.
`;

function sanitize(text = "", max = 1200) {
  return String(text).replace(/\s+/g, " ").trim().slice(0, max);
}

// Para responder a Twilio (TwiML)
function sendTwiml(res, message) {
  res.set("Content-Type", "text/xml");
  res.send(`<Response><Message>${message}</Message></Response>`);
}

// Endpoint de salud
app.get("/", (_req, res) => res.status(200).send("OK - Jarvis online"));

app.get("/webhook", (_req, res) =>
  res.status(200).send("OK - /webhook GET. Use POST desde Twilio.")
);

// ------- Lógica principal del bot -------
app.post("/webhook", async (req, res) => {
  try {
    const from = req.body.From || "desconocido";
    const body = sanitize(req.body.Body || "");

    console.log("Inbound from Twilio:", { from, body });

    if (!OPENAI_API_KEY) {
      console.error("Falta OPENAI_API_KEY");
      return sendTwiml(res, FALLBACK_REPLY);
    }

    // Recuperar historial breve del contacto
    const history = memory.get(from) || [];

    // Construir mensajes para OpenAI
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history, // últimos turnos del chat
      { role: "user", content: body }
    ];

    // Llamado a OpenAI (Chat Completions)
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",     // rápido y económico; puedes cambiar a gpt-4o si quieres más calidad
        temperature: 0.3,         // control de creatividad (0.2–0.5 recomendado)
        messages
      })
    });

    const data = await openaiRes.json();

    // Si algo salió mal con la API
    if (!openaiRes.ok) {
      console.error("OpenAI error:", data);
      return sendTwiml(res, FALLBACK_REPLY);
    }

    let reply = sanitize(data?.choices?.[0]?.message?.content || "");
    if (!reply) reply = FALLBACK_REPLY;

    // Actualizar memoria (capamos a los últimos 6 turnos)
    const updated = [
      ...history,
      { role: "user", content: body },
      { role: "assistant", content: reply }
    ].slice(-MAX_TURNS);

    memory.set(from, updated);

    // Responder a WhatsApp
    return sendTwiml(res, reply);
  } catch (err) {
    console.error("Webhook error:", err);
    return sendTwiml(res, FALLBACK_REPLY);
  }
});

// Lanzar servidor
app.listen(PORT, () => console.log(`Jarvis corriendo en puerto ${PORT}`));
