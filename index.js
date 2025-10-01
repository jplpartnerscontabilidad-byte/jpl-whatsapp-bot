// index.js - Jarvis (simple) con Twilio + Express en ESM

import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

// Twilio en ESM: import default y extrae twiml
import twilio from "twilio";
const { MessagingResponse } = twilio.twiml;

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// --- Utilidad simple para respuestas según intención ---
function respuestaJarvis(texto) {
  const t = (texto || "").toLowerCase();

  if (!t || t === "hola" || t.startsWith("buenos") || t.includes("saludo")) {
    return "¡Hola! Soy Jarvis de JPL Partners 👋. ¿En qué tema contable/tributario te apoyamos? (Contabilidad / Impuestos / Nómina / Auditoría)";
  }

  if (t.includes("contab")) {
    return "Perfecto. Para contabilidad, ¿tu empresa es micro, pequeña, mediana o grande? y ¿en qué ciudad operan?";
  }

  if (t.includes("impuest") || t.includes("tribut")) {
    return "Entendido. Sobre impuestos: ¿hablamos de declaración anual, retenciones, IVA, régimen simple u otra obligación puntual?";
  }

  if (t.includes("nómina") || t.includes("nomina")) {
    return "Claro. En nómina, ¿cuántos empleados tienen y qué software usan (si aplica)?";
  }

  if (t.includes("auditor")) {
    return "Perfecto. ¿La auditoría es interna, externa o por requerimiento específico? ¿Qué periodo necesitan revisar?";
  }

  // Fallback
  return "¡Gracias por el mensaje! Para ayudarte mejor, cuéntame si es sobre Contabilidad, Impuestos, Nómina o Auditoría. 👨‍💼📊";
}

// --- Webhook de Twilio ---
app.post("/webhook", async (req, res) => {
  try {
    // Twilio envía From/Body (a veces en minúsculas según lib). Mapeamos seguro:
    const from = req.body.From || req.body.from || "";
    const body = (req.body.Body || req.body.body || "").trim();

    console.log("Inbound from Twilio:", { from, body });

    const twiml = new MessagingResponse();
    const msg = twiml.message();

    // Respuesta del “asistente”
    const texto = respuestaJarvis(body);
    msg.body(texto);

    res.writeHead(200, { "Content-Type": "text/xml" }).end(twiml.toString());
  } catch (err) {
    console.error("Error en /webhook:", err);
    res.status(500).send("Error");
  }
});

// Healthcheck
app.get("/", (_req, res) => res.send("OK - JPL bot vivo"));

// Puerto para Render
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Jarvis (simple) escuchando en puerto ${PORT}`);
});
