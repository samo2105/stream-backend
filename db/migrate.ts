import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getDb, closeDb } from './index';

export async function runMigrations(): Promise<void> {
  const sql = getDb();
  console.log('🔄 Ejecutando migraciones SQL...');

  const migrationsDir = join(import.meta.dir, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`  ➔ Aplicando migración: ${file}`);
    const filePath = join(migrationsDir, file);
    const sqlContent = readFileSync(filePath, 'utf-8');
    await sql.unsafe(sqlContent);
  }

  console.log('✅ Migraciones completadas exitosamente.');
}

if (import.meta.main) {
  runMigrations()
    .catch((err) => {
      console.error('❌ Error ejecutando migraciones:', err);
      process.exit(1);
    })
    .finally(() => closeDb());
}
