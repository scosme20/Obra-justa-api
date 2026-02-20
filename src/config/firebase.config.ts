import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = path.resolve(
  process.cwd(),
  'firebase-credentials.json',
);

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log('✅ Firebase conectado com sucesso usando o arquivo na raiz!');
  }
} catch (error) {
  console.error(
    '❌ Erro ao carregar as credenciais do Firebase:',
    error.message,
  );
  console.log(
    'Verifique se o arquivo firebase-credentials.json está na pasta: ' +
      process.cwd(),
  );
}

export const db = admin.firestore();
