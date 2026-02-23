import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = path.resolve(process.cwd(), 'firebase-auth.json');

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log('✅ Firebase conectado com sucesso!');
  }
} catch (error) {
  console.error('❌ Erro ao carregar Firebase:', error.message);
}

export const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

export const auth = admin.auth();
