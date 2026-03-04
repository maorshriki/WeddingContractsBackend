/**
 * סקריפט Seed: טוען תבניות ברירת מחדל מקובץ JSON ומזין כ־12 חוזים לדמו.
 * תבניות דיפולטיביות – נטענות מהקובץ data/default-templates.json (ללא שימוש ב-DB).
 * חוזים – נשמרים ב-DB (טבלת contracts).
 *
 * הרצה: npm run build && node dist/scripts/seed.js
 * או: npx ts-node scripts/seed.ts
 */

import { pool } from '../src/db/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

const DEMO_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DEMO_EMAIL = 'daniel@example.com';
const DEMO_PASSWORD = 'demo123';
const DEMO_NAME = 'דניאל הפקות';

interface SeedContract {
  vendorType: string;
  coupleName: string;
  eventDate: string;
  location: string;
  totalAmount: number;
  advancePayment: number;
  status: string;
}

async function ensureDemoUser() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await pool.query(
    `INSERT INTO users (id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3, name = $4`,
    [DEMO_USER_ID, DEMO_EMAIL, hash, DEMO_NAME]
  );
  console.log('Demo user OK:', DEMO_EMAIL);
}

async function seedContracts() {
  const dataPath = path.join(process.cwd(), 'data', 'seed-contracts.json');
  const altPath = path.join(__dirname, '..', 'data', 'seed-contracts.json');
  const jsonPath = fs.existsSync(dataPath) ? dataPath : altPath;
  if (!fs.existsSync(jsonPath)) {
    console.warn('לא נמצא data/seed-contracts.json – מדלג על הזנת חוזים.');
    return;
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const contracts = JSON.parse(raw) as SeedContract[];
  const startTime = '19:00';
  let inserted = 0;
  for (const c of contracts) {
    await pool.query(
      `INSERT INTO contracts (
        user_id, vendor_type, couple_name, event_date, location, start_time,
        total_amount, advance_payment, payment_schedule, cancellation_term_ids, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        DEMO_USER_ID,
        c.vendorType,
        c.coupleName,
        c.eventDate,
        c.location,
        startTime,
        c.totalAmount,
        c.advancePayment,
        JSON.stringify([]),
        [],
        c.status || 'טיוטה',
      ]
    );
    inserted++;
  }
  console.log('חוזים שהוזנו:', inserted);
}

async function main() {
  try {
    await ensureDemoUser();
    await seedContracts();
    console.log('Seed הושלם.');
  } catch (err) {
    console.error('Seed נכשל:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
