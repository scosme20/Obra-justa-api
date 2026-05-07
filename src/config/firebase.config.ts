import * as admin from 'firebase-admin';

function initFirebase(): void {
  if (admin.apps.length > 0) return;

  try {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Configurações do Firebase ausentes no ambiente.');
    }

    // A mágica para aceitar o formato do .env e do Render simultaneamente
    const formattedKey = privateKey
      .replace(/^"|"$/g, '') // Remove aspas no início e fim (comum no .env)
      .replace(/\\n/g, '\n'); // Converte o texto "\n" em quebras de linha reais

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      }),
    });

    console.log(`✅ Firebase conectado: ${projectId}`);
  } catch (error) {
    console.error('❌ Erro Crítico Firebase:', error.message);
  }
}

// Singletons e Proxies (iguais aos anteriores)
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
