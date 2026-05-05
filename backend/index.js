const express = require('express');
const axios = require('axios');
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const dialogflow = require('@google-cloud/dialogflow');
const cors = require('cors');

// --- VARIÁVEIS DE AMBIENTE ---
const PROJECT_ID = process.env.PROJECT_ID || "whatsapp-bot-mila";
const FB_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const FIRESTORE_DB_ID = process.env.FIRESTORE_DB_ID || "db-clientes-contcertbr";

if (!admin.apps.length) { admin.initializeApp(); }
const db = getFirestore(FIRESTORE_DB_ID);
const sessionClient = new dialogflow.SessionsClient();

const app = express();
app.use(express.json());
app.use(cors());

async function enviarWhatsApp(to, text) {
    try {
        await axios.post(`https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`, {
            messaging_product: "whatsapp",
            to: to,
            type: "text",
            text: { body: text }
        }, { headers: { 'Authorization': `Bearer ${FB_TOKEN}` } });
    } catch (e) { console.error("Erro WhatsApp:", e.response?.data || e.message); }
}

async function detectarIntencao(text, sessionId) {
    const sessionPath = sessionClient.projectAgentSessionPath(PROJECT_ID, sessionId);
    const request = {
        session: sessionPath,
        queryInput: { text: { text: text, languageCode: 'pt-BR' } },
    };
    const responses = await sessionClient.detectIntent(request);
    return responses[0].queryResult;
}

app.post('/webhook', async (req, res) => {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
        const msg = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (!msg) return res.sendStatus(200);

        const senderId = msg.from;
        const userText = msg.text?.body || "";

        try {
            const queryResult = await detectarIntencao(userText, senderId);
            const intentName = queryResult.intent?.displayName;
            let fulfillmentText = queryResult.fulfillmentText;

            // --- LÓGICA DE CONSULTA BLINDADA ---
            if (intentName === 'Consulta_CNPJ') {
                // 1. Extraímos apenas os números do que o usuário digitou
                const numeroLimpo = userText.replace(/\D/g, '');

                // 2. Só consultamos se tiver 11 (CPF) ou 14 (CNPJ) dígitos
                // Isso ignora o "1" do menu automaticamente
                if (numeroLimpo.length === 11 || numeroLimpo.length === 14) {
                    const clienteDoc = await db.collection('clientes').doc(numeroLimpo).get();

                    if (clienteDoc.exists) {
                        const d = clienteDoc.data();
                        fulfillmentText = `✅ *Certificado Localizado!*\n\n🏢 *Empresa:* ${d.NOME}\n📅 *Validade:* ${d.VALIDADE}\n⏳ *Status:* ${d.DIAS_RESTANTES} dias restantes.`;
                    } else {
                        fulfillmentText = `❌ O documento *${numeroLimpo}* não foi encontrado em nossa base de dados.`;
                    }
                    
                    // FORÇAR LOG NO FIRESTORE (Para debug real)
                    await db.collection('interacoes').add({
                        cliente: senderId,
                        documento_consultado: numeroLimpo,
                        mensagem_original: userText,
                        status: clienteDoc.exists ? "sucesso" : "nao_encontrado",
                        timestamp: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            // Envia a resposta final
            if (fulfillmentText) {
                await enviarWhatsApp(senderId, fulfillmentText);
            }

        } catch (err) { 
            console.error("Erro processamento:", err); 
        }
        
        return res.sendStatus(200);
    }
    
    if (req.query['hub.mode'] === 'subscribe') return res.send(req.query['hub.challenge']);
    res.sendStatus(404);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Mila 2.0 ativa na porta ${PORT}`));



