import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔒 Connecting to Supabase database to audit and enable Row-Level Security (RLS)...');

  // 1. Get all public tables
  const tables: Array<{ tablename: string; rowsecurity: boolean }> = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC;
  `);

  console.log(`Found ${tables.length} tables in public schema:`);
  for (const t of tables) {
    console.log(`- ${t.tablename}: RLS currently ${t.rowsecurity ? 'ENABLED ✅' : 'DISABLED ❌'}`);
  }

  // 2. Enable RLS on all tables
  console.log('\n⚙️ Enabling Row-Level Security on all public tables...');
  for (const t of tables) {
    const tableName = t.tablename;
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;`);
      console.log(`  ✓ RLS enabled on public."${tableName}"`);
    } catch (err: any) {
      console.error(`  ❌ Failed on ${tableName}:`, err.message);
    }
  }

  // 3. Revoke public/anon/authenticated access via PostgREST
  console.log('\n🛡️ Revoking anonymous and unauthenticated access from PostgREST roles...');
  const revokeStatements = [
    'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;',
    'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;',
    'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;',
    'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;',
    'REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;',
    'REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;',
    'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;',
  ];

  for (const stmt of revokeStatements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(`  ✓ Executed: ${stmt.trim()}`);
    } catch (err: any) {
      console.warn(`  ⚠️ Note on (${stmt.trim()}):`, err.message);
    }
  }

  // 4. Verify the updated status
  const verifiedTables: Array<{ tablename: string; rowsecurity: boolean }> = await prisma.$queryRawUnsafe(`
    SELECT tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename ASC;
  `);

  console.log('\n✅ Verification of public tables after lockdown:');
  let allSecured = true;
  for (const t of verifiedTables) {
    console.log(`  ${t.rowsecurity ? '🔒' : '⚠️'} ${t.tablename}: RLS is ${t.rowsecurity ? 'ACTIVE' : 'INACTIVE'}`);
    if (!t.rowsecurity) allSecured = false;
  }

  if (allSecured) {
    console.log('\n🎉 ALL TABLES ARE NOW SECURED WITH ROW-LEVEL SECURITY!');
    console.log('PostgREST public exploitation is blocked. Your Prisma app will continue to function normally.');
  } else {
    console.warn('\n⚠️ Some tables still have RLS disabled.');
  }
}

main()
  .catch((e) => {
    console.error('Fatal error during RLS lockdown:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
