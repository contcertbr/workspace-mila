const admin = require('firebase-admin');

// Inicializa o Admin SDK
if (!admin.apps.length) {
    admin.initializeApp({
        // Se estiver no Google Cloud Run, ele usa a credencial padrão automaticamente
        credential: admin.credential.applicationDefault() 
    });
}

/**
 * Se o seu banco de dados no Firestore não for o "(default)"
 * e sim um banco específico chamado "db-clientes-contcertbr",
 * usamos a linha abaixo para conectar a ele.
 */
const db = admin.firestore("db-clientes-contcertbr"); 

module.exports = { db };