const express = require('express');
const { Firestore } = require('@google-cloud/firestore');
const app = express();
app.use(express.json());

// Conecta ao banco específico solicitado
const db = new Firestore({ databaseId: 'db-clientes-contcertbr' });

// Rota de Webhook para o WhatsApp (Meta)
app.get('/webhook', (req, res) => {
  const VERIFY_TOKEN = "mila_token_2026";
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.status(200).send(req.query['hub.challenge']);
  } else { res.sendStatus(403); }
});

app.post('/webhook', async (req, res) => {
  await db.collection('interacoes').add({ 
    source: 'whatsapp', 
    content: req.body, 
    time: new Date() 
  });
  res.status(200).send('EVENT_RECEIVED');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log('Servidor Mila Ativo'));