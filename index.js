const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// Webhook de Twilio
app.post("/webhook", async (req, res) => {
  const message = req.body.Body;
  const from = req.body.From;

  console.log("Mensaje recibido:", message, "De:", from);

  // Aquí se conecta a GPT (simulación básica con respuesta fija por ahora)
  let reply = "👋 Hola, gracias por escribir a JPL Partners. Cuéntanos, ¿en qué podemos ayudarte con tu contabilidad o impuestos?";

  // Responder a Twilio
  res.set("Content-Type", "application/xml");
  res.send(`
    <Response>
      <Message>${reply}</Message>
    </Response>
  `);
});

// Puerto dinámico (Render asigna PORT automáticamente)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Bot corriendo en puerto ${PORT}`);
});
