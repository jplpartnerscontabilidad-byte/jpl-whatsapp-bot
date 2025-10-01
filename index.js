// index.js  (CommonJS)
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: false })); // Twilio envía x-www-form-urlencoded

// Salud general (para probar en el navegador)
app.get("/", (_req, res) => {
  res.status(200).send("OK - JPL bot vivo");
});

// Salud de la ruta webhook con GET (para navegador)
app.get("/webhook", (_req, res) => {
  res.status(200).send("OK - /webhook GET. Use POST desde Twilio.");
});

// Webhook real (Twilio llama aquí con POST)
app.post("/webhook", (req, res) => {
  console.log("Inbound from Twilio:", { from: req.body.From, body: req.body.Body });

  // Respuesta TwiML fija (sin GPT) para validar toda la tubería
  const twiml = `
    <Response>
      <Message>👋 Hola, soy Jarvis de JPL Partners. ¡Te leo!</Message>
    </Response>
  `;
  res.set("Content-Type", "text/xml");
  res.send(twiml);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot corriendo en puerto ${PORT}`));
