import express from "express";
import pkg from "twilio";

const { twiml: TwiML } = pkg;
const app = express();
app.use(express.urlencoded({ extended: false }));

// Número de WhatsApp de Twilio (remitente oficial)
const fromWhatsApp = "whatsapp:+15558403865";

// Ruta Webhook que Twilio usará para enviarte los mensajes
app.post("/webhook", (req, res) => {
  const MessagingResponse = TwiML.MessagingResponse;
  const twiml = new MessagingResponse();

  // ✅ Aquí defines la respuesta del bot
  const respuesta =
    "👋 Hola, gracias por escribir a *JPL Partners*.\n\n" +
    "Soy tu asesor contable virtual. 📊\n\n" +
    "Puedo ayudarte con:\n" +
    "1️⃣ Impuestos\n" +
    "2️⃣ Contabilidad\n" +
    "3️⃣ Nómina\n" +
    "4️⃣ Facturación electrónica\n\n" +
    "👉 Escríbeme el número de la opción que necesites y con gusto te asesoraré.";

  twiml.message(respuesta);

  res.writeHead(200, { "Content-Type": "text/xml" });
  res.end(twiml.toString());
});

// Puerto dinámico (Render usa process.env.PORT)
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`🚀 Jarvis (asesor contable) escuchando en puerto ${port}`);
});
