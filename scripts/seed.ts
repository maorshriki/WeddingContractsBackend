/**
 * סקריפט Seed מרכזי לכל המידע בדמו:
 * - יוזר דמו
 * - תבניות ברירת מחדל (default_templates)
 * - תבניות משתמש לדמו (contract_templates)
 * - חוזים לדמו (contracts)
 *
 * הרצה: npm run build && node dist/scripts/seed.js
 * או: npx ts-node scripts/seed.ts
 */

import { pool } from '../src/db/client';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';
import { plainFromSections, TemplateSection } from '../src/lib/rtfFromSections';

const DEMO_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const DEMO_EMAIL = 'daniel@example.com';
const DEMO_PASSWORD = 'demo123';
const DEMO_NAME = 'דניאל הפקות';

interface SeedContract {
  vendorType: string;
  coupleName: string;
  clientPhone: string;
  eventDate: string;
  location: string;
  totalAmount: number;
  advancePayment: number;
  status: string;
}

interface JsonTemplate {
  id: string;
  name: string;
  templateDescription?: string;
  vendorType: string;
  sectionContents?: string[];
  sections?: TemplateSection[];
}

function loadJsonFile<T>(fileName: string): T {
  const cwdPath = path.join(process.cwd(), 'data', fileName);
  const altPath = path.join(__dirname, '..', 'data', fileName);
  const jsonPath = fs.existsSync(cwdPath) ? cwdPath : altPath;
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`לא נמצא קובץ data/${fileName}`);
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  return JSON.parse(raw) as T;
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

async function seedDefaultTemplates() {
  const templates = loadJsonFile<JsonTemplate[]>('default-templates.json');
  await pool.query('DELETE FROM default_templates');

  let inserted = 0;
  for (const t of templates) {
    const sectionContents = Array.isArray(t.sections) && t.sections.length > 0
      ? [plainFromSections(t.sections)]
      : (Array.isArray(t.sectionContents) ? t.sectionContents : [String(t.sectionContents ?? '')]);

    await pool.query(
      `INSERT INTO default_templates (
        id, name, template_description, vendor_type, section_contents
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        t.id,
        t.name || 'תבנית',
        t.templateDescription ?? '',
        t.vendorType || 'אחר',
        JSON.stringify(sectionContents),
      ]
    );
    inserted++;
  }

  console.log('תבניות ברירת מחדל שהוזנו:', inserted);
}

async function seedDemoUserTemplates() {
  const templates = loadJsonFile<JsonTemplate[]>('default-templates.json');
  await pool.query(`DELETE FROM contract_templates WHERE user_id = $1`, [DEMO_USER_ID]);

  // שומרים כמה תבניות "שלי" לדמו מהתבניות הדיפולטיביות.
  const selected = templates.slice(0, 4);
  let inserted = 0;
  for (const t of selected) {
    const sectionContents = Array.isArray(t.sections) && t.sections.length > 0
      ? [plainFromSections(t.sections)]
      : (Array.isArray(t.sectionContents) ? t.sectionContents : [String(t.sectionContents ?? '')]);

    await pool.query(
      `INSERT INTO contract_templates (
        user_id, name, template_description, vendor_type, section_contents
      ) VALUES ($1, $2, $3, $4, $5)`,
      [
        DEMO_USER_ID,
        `${t.name} (שלי)`,
        t.templateDescription ?? '',
        t.vendorType || null,
        JSON.stringify(sectionContents),
      ]
    );
    inserted++;
  }

  console.log('תבניות משתמש לדמו שהוזנו:', inserted);
}

async function seedContracts() {
  const contracts = loadJsonFile<SeedContract[]>('seed-contracts.json');
  await pool.query(`DELETE FROM contracts WHERE user_id = $1`, [DEMO_USER_ID]);

  const startTime = '19:00';
  let inserted = 0;
  for (const c of contracts) {
    await pool.query(
      `INSERT INTO contracts (
        user_id, vendor_type, couple_name, client_phone, event_date, location, start_time,
        total_amount, advance_payment, payment_schedule, cancellation_term_ids, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        DEMO_USER_ID,
        c.vendorType,
        c.coupleName,
        c.clientPhone,
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
    await seedDefaultTemplates();
    await seedDemoUserTemplates();
    await seedContracts();
    console.log('Seed מרכזי הושלם.');
  } catch (err) {
    console.error('Seed נכשל:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
