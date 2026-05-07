import * as admin from 'firebase-admin';
import * as path from 'path';

function initFirebase(): void {
  if (admin.apps.length) return;
  try {
    const serviceAccountPath = path.resolve(
      process.cwd(),
      'firebase-auth.json',
    );
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath),
    });
    console.log('✅ Firebase conectado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao carregar Firebase:', error.message);
  }
}

let _db: admin.firestore.Firestore | null = null;
let _auth: admin.auth.Auth | null = null;

export function getDb(): admin.firestore.Firestore {
  if (!_db) {
    initFirebase();
    _db = admin.firestore();
    _db.settings({ ignoreUndefinedProperties: true });
  }
  return _db;
}

export function getAuth(): admin.auth.Auth {
  if (!_auth) {
    initFirebase();
    _auth = admin.auth();
  }
  return _auth;
}

// Aliases para manter compatibilidade com código existente
export const db = new Proxy({} as admin.firestore.Firestore, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export const auth = new Proxy({} as admin.auth.Auth, {
  get(_target, prop) {
    return (getAuth() as any)[prop];
  },
});
