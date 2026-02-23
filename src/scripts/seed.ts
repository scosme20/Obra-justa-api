import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const serviceAccountPath = path.resolve(__dirname, '../../firebase-auth.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERRO: Arquivo firebase-credentials.json não encontrado!');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = admin.firestore();

const USER_ID = 'jsQsRlANNlJFLlBLF7mh';

async function runSeed() {
  console.log('🌱 Iniciando Seed para o usuário Sebastiao...');

  try {
    const budgets = [
      {
        userId: USER_ID,
        totalValue: 480,
        status: 'ANALYZED',
        createdAt: new Date().toISOString(),
        items: [
          {
            product: 'cimento',
            price: 48,
            quantity: 10,
            category: 'Alvenaria',
            status: 'CARO',
            color: 'red',
          },
        ],
      },
      {
        userId: USER_ID,
        totalValue: 300,
        status: 'ANALYZED',
        createdAt: new Date().toISOString(),
        items: [
          {
            product: 'areia média',
            price: 150,
            quantity: 2,
            category: 'Alvenaria',
            status: 'PREÇO JUSTO',
            color: 'green',
          },
        ],
      },
    ];

    console.log('  -> Inserindo orçamentos analisados...');
    for (const b of budgets) {
      const docRef = await db.collection('budgets').add(b);
      console.log(`     ✅ Orçamento criado: ${docRef.id}`);
    }

    const stockItems = [
      {
        userId: USER_ID,
        product: 'cimento',
        quantity: 60,
        unit: 'saco',
        category: 'Alvenaria',
      },
      {
        userId: USER_ID,
        product: 'areia média',
        quantity: 10,
        unit: 'm3',
        category: 'Alvenaria',
      },
    ];

    console.log('  -> Populando estoque da obra...');
    for (const item of stockItems) {
      await db.collection('work_stock').add(item);
    }

    console.log('\n✅ SEED FINALIZADO COM SUCESSO!');
    console.log(`👤 Usuário: Sebastiao (${USER_ID})`);
  } catch (err) {
    console.error('❌ Erro no Firestore:', err);
  } finally {
    process.exit();
  }
}

runSeed();
