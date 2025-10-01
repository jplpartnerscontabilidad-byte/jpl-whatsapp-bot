// index.cjs — versión simple y estable (sin OpenAI) para probar end-to-end
const express = require("express");
const { twiml: TwiML } = require("twilio");

const app = express();
app.use(express.urlencoded({ extended: false }));

// Pequeño “router” de intenciones básicas
function generarRespuesta(msg) {
  const t = (msg || "").toLowerCase();

  // Saludos
  if (/\b(hola|buenos dias|buenas|buenas tardes|buenas noches)\b/.test(t)) {
    return (
      "¡Hola! Soy Jarvis de JPL Partners 👋.\n" +
      "Cuéntame: ¿tu consulta es sobre *contabilidad*, *impuestos* o *nómina*?\n" +
      "Puedo guiarte paso a paso. 🙂"
    );
  }

  // Impuestos
  if (/(impuesto|renta|iva|ica|retención|retencion)/.test(t)) {
    return (
      "Perfecto, hablemos de *impuestos* 🧾.\n" +
      "¿Eres *persona natural* o *empresa*? y ¿en qué ciudad operas? Con eso te digo pasos y fechas clave."
    );
  }

  // Contabilidad
  if (/(contab|balance|niif|facturaci[oó]n|facturacion|estados financieros)/.test(t)) {
    return (
      "Sobre *contabilidad* 📊: ¿qué necesitas exactamente? " +
      "¿Organizar libros, implementar NIIF, emitir estados financieros o automatizar facturación?"
    );
  }

  // Nómina
  if (/(n[oó]mina|nomina|seguridad social|prestaciones|contrato|salario)/.test(t)) {
    return (
      "En *nómina* 👥, puedo ayudarte con liquidaciones, seguridad social y cálculo de prestaciones. " +
      "¿Cuántos empleados tienes y con qué periodicidad pagas?"
    );
  }

  // Si no entendemos bien
  return (
    "Gracias por escribir a *JPL Partners* 🙌.\n" +
    "Para apoyarte mejor, dime si tu consulta es sobre:\n" +
    "• Contabilidad\n• Impuestos\n• Nómina\n" +
    "y cuál es tu ciudad/actividad. Con eso te doy pasos claros. 🙂"
  );
}

app.post("/webhook", (req, res) => {
  const from = req.body.From || "";
  const body = (req.body.Body || "").trim();
  console.log("Inbound from Twilio:", { from, body });

  const respuesta = generarRespuesta(body);

  const twiml = new TwiML.MessagingResponse();
  twiml.message(respuesta);
  res.type("text/xml").status(200).send(twiml.toString());
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Jarvis (simple) escuchando en puerto ${PORT}`));
