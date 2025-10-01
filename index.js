// index.js
// Bot "Jarvis" de JPL Partners – Asesor Contable Virtual
// WhatsApp + Twilio + OpenAI

import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// Configuración del puerto y API Key
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Memoria por usuario (últimos mensajes)
const memoria = new Map();
const MAX_INTERCAMBIOS = 6;

// Función para generar respuesta usando OpenAI
async function generarRespuesta(usuario, mensaje) {
  // Recuperar historial del usuario
  let historial = memoria.get(usuario) || [];
  historial.push({ role: "user", content: mensaje });

  // Limitar historial a los últimos intercambios
  if (historial.length > MAX_INTERCAMBIOS) {
    historial = historial.slice(-MAX_INTERCAMBIOS);
  }

  // Prompt inicial para que actúe como asesor contable
  const promptSistema = {
    role: "system",
    content: `Eres Jarvis, un asesor contable profesional y amigable de JPL Partners en Colombia. 
Responde en español, tono cercano pero profesional. 
Ayudas a empresarios con temas de contabilidad, impuestos, nómina, facturación electrónica y finanzas. 
Si no entiendes algo, pide amablemente más detalles.`
  };

  const mensajes = [promptSistema, ...historial];

  // Llamada a la API de OpenAI
  const respuesta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // económico y rápido
      messages: mensajes,
      temperature: 0.7,
    }),
  });

  const data = await respuesta.json();
  const texto = data.choices?.[0]?.message?.content || "Lo siento, hubo un error.";

  // Guardar en memoria
  historial.push({ role: "assistant", content: texto });
  memoria.set(usuario, historial);

  return texto;
}

// Webhook para mensajes entrantes de Twilio
app.post("/webhook", async (req, res) => {
  const twilio = req.body;
  const mensajeEntrante = twilio.Body || "";
  const numeroUsuario = twilio.From || "usuario";

  try {
    const respuesta = await generarRespuesta(numeroUsuario, mensajeEntrante);

    // Formato Twilio para responder
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>${respuesta}</Message>
      </Response>
    `);
  } catch (error) {
    console.error(error);
    res.set("Content-Type", "text/xml");
    res.send(`
      <Response>
        <Message>Lo siento, ocurrió un error. Intenta de nuevo en un momento.</Message>
      </Response>
    `);
  }
});

// Endpoint de prueba
app.get("/", (req, res) => {
  res.send("✅ Jarvis está vivo y listo para asesorar");
});

// Iniciar servidor
app.listen(PORT, () => console.log(`Servidor Jarvis escuchando en puerto ${PORT}`));

