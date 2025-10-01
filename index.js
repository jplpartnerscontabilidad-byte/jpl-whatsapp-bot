// index.js (CommonJS)
// Jarvis - Asesor contable (ES-CO) para JPL Partners
// Express + Twilio Webhook + OpenAI (vía fetch de Node 18+)

const express = require("express");
const app = express();

// Twilio envía application/x-www-form-urlencoded por defecto
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Memoria simple por usuario (últimos N turnos)
const memoria = new Map();
const MAX_TURNS = 6;

// Genera respuesta usando la API de OpenAI (chat.completions)
async function generarRespuesta(usuario, mensaje) {
  // Recupero historial breve
  let hist = memoria.get(usuario) || [];

  // Mensaje del usuario
  hist.push({ role: "user", content: mensaje });
  if (hist.length > MAX_TURNS) hist = hist.slice(-MAX_TURNS);

  // Instrucción de sistema (rol del asesor)
  const systemPrompt = {
    role: "system",
    content: `Eres Jarvis, asesor contable profesional y cercano de JPL Partners en Colombia.
Hablas en español (Colombia) y ayudas a empresarios con: contabilidad, impuestos, nómina,
facturación electrónica y reportes financieros.
Usa un tono claro, amable y experto, ofrece pasos concretos y preguntas de clarificación
cuando falte información.`
  };

  const mensajes = [systemPrompt, ...hist];

  // Llamada simple al endpoint de Chat Completions
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: mensajes,
      temperature: 0.7
    })
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("OpenAI error:", txt);
    return "Lo siento, tuve un inconveniente procesando tu solicitud. ¿Puedes intentar nuevamente?";
  }

  const data = await resp.json();
  const texto = data?.choices?.[0]?.message?.content?.trim() ||
    "Lo siento, ocurrió un error al generar la respuesta.";

  // Guardar turno del asistente
  hist.push({ role: "assistant", content: texto });
  memoria.set(usuario, hist);

  return texto;
}

// Webhook de Twilio (WhatsApp)
app.post("/webhook", async (req, res) => {
  try {
    // Twilio envía campos Body y From
    const cuerpo = req.body || {};
    const mensaje = (cuerpo.Body || "").trim();
    const usuario = cuerpo.From || "desconocido";

    if (!mensaje) {
      res.set("Content-Type", "text/xml");
      return res.send(`
        <Response>
          <Message>No recibí tu mensaje. ¿Puedes enviarlo nuevamente?</Message>
        </Response>
      `);
    }

    const reply = await generarRespuesta(usuario, mensaje);

    // Twilio espera XML
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>${escapeXML(reply)}</Message>
      </Response>
    `);
  } catch (e) {
    console.error("Error en /webhook:", e);
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>Hubo un error interno. Intentemos de nuevo en un momento.</Message>
      </Response>
    `);
  }
});

// Página de vida
app.get("/", (_req, res) => {
  res.send("✅ Jarvis de JPL Partners está en línea");
});

// Escuchar puerto
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});

// --- Utilidad para XML (evita caracteres problemáticos) ---
function escapeXML(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
