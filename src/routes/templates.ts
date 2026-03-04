import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../db/client';
import { authMiddleware, JwtPayload } from '../middleware/auth';
import { rowToTemplate, ContractTemplate } from '../types/template';
import { DefaultTemplate } from '../types/template';
import { isDbConnectionError, DB_UNAVAILABLE_MESSAGE } from '../lib/dbError';
import { rtfFromSections, plainFromSections, TemplateSection } from '../lib/rtfFromSections';

const router = Router();

interface JsonTemplate {
  id: string;
  name: string;
  templateDescription?: string;
  vendorType: string;
  sectionContents?: string[];
  sections?: TemplateSection[];
}

/** טעינת תבניות ברירת מחדל מקובץ JSON (ללא DB). אם יש sections – ממירים ל-RTF עם כותרות מודגשות. */
function loadDefaultTemplates(): DefaultTemplate[] {
  const toTry = [
    path.join(process.cwd(), 'data', 'default-templates.json'),
    path.join(__dirname, '..', '..', 'data', 'default-templates.json'),
  ];
  for (const p of toTry) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      const arr = JSON.parse(raw) as JsonTemplate[];
      const now = new Date().toISOString();
      const result = arr.map((t) => {
        let sectionContents: string[];
        if (Array.isArray(t.sections) && t.sections.length > 0) {
          // טקסט פשוט – מפענח ה-RTF ב-iOS לא תומך ב־ansicpg1255, אז שולחים plain
          sectionContents = [plainFromSections(t.sections)];
        } else {
          const rawSc = t.sectionContents;
          sectionContents = Array.isArray(rawSc) ? rawSc : [String(rawSc ?? '')];
        }
        return {
          id: t.id,
          name: t.name,
          templateDescription: t.templateDescription || '',
          vendorType: t.vendorType,
          sectionContents,
          createdAt: now,
        };
      });
      console.log(`[templates] Loaded ${result.length} default templates from ${p}`);
      return result;
    }
  }
  console.warn('[templates] default-templates.json not found. Tried:', toTry);
  return [];
}

// GET /templates/defaults — תבניות ברירת מחדל (ללא אימות – כולם יכולים לראות)
router.get('/defaults', async (_req: Request, res: Response) => {
  try {
    const templates = loadDefaultTemplates();
    res.json(templates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'שגיאה בקבלת תבניות ברירת מחדל' });
  }
});

router.use(authMiddleware);

// GET /templates — user's saved templates
router.get('/', async (req: Request, res: Response) => {
  const user = (req as Request & { user: JwtPayload }).user;
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, name, template_description, vendor_type, section_contents, created_at
       FROM contract_templates WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.userId]
    );
    res.json(rows.map(rowToTemplate));
  } catch (err) {
    if (isDbConnectionError(err)) {
      return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    }
    console.error(err);
    res.status(500).json({ error: 'שגיאה בקבלת התבניות' });
  }
});

// POST /templates — save user template (name + content)
router.post('/', async (req: Request, res: Response) => {
  const user = (req as Request & { user: JwtPayload }).user;
  const body = req.body as Partial<ContractTemplate>;
  if (!body.name) {
    return res.status(400).json({ error: 'חסר שם תבנית' });
  }
  try {
    const sectionContents = Array.isArray(body.sectionContents) ? body.sectionContents : [];
    const { rows } = await pool.query(
      `INSERT INTO contract_templates (user_id, name, template_description, vendor_type, section_contents)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        user.userId,
        body.name,
        body.templateDescription ?? '',
        body.vendorType ?? null,
        JSON.stringify(sectionContents),
      ]
    );
    res.status(201).json(rowToTemplate(rows[0]));
  } catch (err) {
    if (isDbConnectionError(err)) {
      return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    }
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשמירת התבנית' });
  }
});

// PATCH /templates/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const user = (req as Request & { user: JwtPayload }).user;
  const { id } = req.params;
  const body = req.body as Partial<ContractTemplate>;
  const updates: string[] = [];
  const values: unknown[] = [];
  let pos = 1;
  if (body.name !== undefined) {
    updates.push(`name = $${pos++}`);
    values.push(body.name);
  }
  if (body.templateDescription !== undefined) {
    updates.push(`template_description = $${pos++}`);
    values.push(body.templateDescription);
  }
  if (body.vendorType !== undefined) {
    updates.push(`vendor_type = $${pos++}`);
    values.push(body.vendorType);
  }
  if (body.sectionContents !== undefined) {
    updates.push(`section_contents = $${pos++}`);
    values.push(JSON.stringify(body.sectionContents));
  }
  if (updates.length === 0) {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM contract_templates WHERE id = $1 AND user_id = $2`,
        [id, user.userId]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'תבנית לא נמצאה' });
      return res.json(rowToTemplate(rows[0]));
    } catch (err) {
      if (isDbConnectionError(err)) {
        return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
      }
      throw err;
    }
  }
  values.push(id, user.userId);
  try {
    const { rows } = await pool.query(
      `UPDATE contract_templates SET ${updates.join(', ')} WHERE id = $${pos} AND user_id = $${pos + 1} RETURNING *`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'תבנית לא נמצאה' });
    res.json(rowToTemplate(rows[0]));
  } catch (err) {
    if (isDbConnectionError(err)) {
      return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    }
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון התבנית' });
  }
});

// DELETE /templates/:id — delete user's template
router.delete('/:id', async (req: Request, res: Response) => {
  const user = (req as Request & { user: JwtPayload }).user;
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM contract_templates WHERE id = $1 AND user_id = $2`,
      [id, user.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'תבנית לא נמצאה' });
    res.status(204).send();
  } catch (err) {
    if (isDbConnectionError(err)) {
      return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    }
    console.error(err);
    res.status(500).json({ error: 'שגיאה במחיקת התבנית' });
  }
});

export default router;
