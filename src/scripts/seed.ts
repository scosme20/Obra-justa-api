import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const serviceAccountPath = path.resolve(__dirname, '../../firebase-auth.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERRO: Arquivo firebase-auth.json não encontrado!');
  process.exit(1);
}

const userId = process.env.SEED_USER_ID || process.argv[2];
const userName =
  process.env.SEED_USER_NAME || process.argv[3] || 'Usuário Seed';

if (!userId) {
  console.error(
    '❌ ERRO: Informe o userId via variável de ambiente SEED_USER_ID ou como argumento.',
  );
  console.error('  Uso: ts-node src/scripts/seed.ts <userId> <nome>');
  console.error('  Ou:  SEED_USER_ID=xxx SEED_USER_NAME=João npm run seed');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
  });
}

const db = admin.firestore();

async function runSeed() {
  console.log(`\n🌱 Iniciando Seed para o usuário: ${userName} (${userId})\n`);

  try {
    const budgets = [
      {
        userId,
        totalValue: 480,
        status: 'ANALYZED',
        createdAt: new Date().toISOString(),
        items: [
          {
            product: 'cimento',
            price: 48,
            quantity: 10,
            category: 'Alvenaria',
            statusIa: 'CARO',
          },
        ],
        requestedBy: userName,
        contractor: 'N/A',
        storeName: 'Loja Seed',
      },
      {
        userId,
        totalValue: 300,
        status: 'ANALYZED',
        createdAt: new Date().toISOString(),
        items: [
          {
            product: 'areia média',
            price: 150,
            quantity: 2,
            category: 'Alvenaria',
            statusIa: 'PREÇO JUSTO',
          },
        ],
        requestedBy: userName,
        contractor: 'N/A',
        storeName: 'Loja Seed',
      },
    ];

    console.log('📄 Inserindo orçamentos...');
    for (const b of budgets) {
      const ref = await db.collection('budgets').add(b);
      console.log(`   ✅ ${ref.id}`);
    }

    console.log('\n📦 Populando estoque...');
    const stock = {
      userId,
      items: [
        {
          product: 'cimento',
          quantity: 60,
          unit: 'saco',
          category: 'Alvenaria',
          addedAt: new Date().toISOString(),
        },
        {
          product: 'areia média',
          quantity: 10,
          unit: 'm3',
          category: 'Alvenaria',
          addedAt: new Date().toISOString(),
        },
      ],
      lastUpdate: new Date().toISOString(),
    };
    await db.collection('work_stock').doc(userId).set(stock);
    console.log('   ✅ Estoque criado');

    console.log(`\n✅ SEED FINALIZADO — usuário: ${userName} (${userId})\n`);
  } catch (err) {
    console.error('❌ Erro no Firestore:', err);
  } finally {
    process.exit(0);
  }
}

runSeed();
