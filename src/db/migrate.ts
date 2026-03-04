import { pool } from './client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

async function migrate() {
  // Support both src/db and dist/db
  const schemaPath = path.join(__dirname, 'schema.sql');
  let sql: string;
  if (fs.existsSync(schemaPath)) {
    sql = fs.readFileSync(schemaPath, 'utf8');
  } else {
    const srcPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
    sql = fs.readFileSync(srcPath, 'utf8');
  }
  await pool.query(sql);

  // Default templates are loaded from data/default-templates.json by the API (no DB seed).

  // Seed demo user (password: demo123)
  const hash = await bcrypt.hash('demo123', 10);
  await pool.query(
    `INSERT INTO users (id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3, name = $4`,
    ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'daniel@example.com', hash, 'דניאל הפקות']
  );

  console.log('Migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
