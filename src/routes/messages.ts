import { Router, Request, Response } from 'express';
import { pool } from '../db/client';
import { authMiddleware, JwtPayload } from '../middleware/auth';
import { rowToMessage, PredefinedMessage } from '../types/message';
import { isDbConnectionError, DB_UNAVAILABLE_MESSAGE } from '../lib/dbError';

const router = Router();
router.use(authMiddleware);

// GET /messages — רשימת הודעות מובנות של המשתמש
router.get('/', async (req: Request, res: Response) => {
  const user = (req as Request & { user: JwtPayload }).user;
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, title, body, created_at
       FROM predefined_messages WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.userId]
    );
    res.json(rows.map(rowToMessage));
  } catch (err) {
    if (isDbConnectionError(err)) {
      return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    }
    console.error(err);
    res.status(500).json({ error: 'שגיאה בקבלת ההודעות המובנות' });
  }
});

// POST /messages — יצירת הודעה מובנית
router.post('/', async (req: Request, res: Response) => {
  const user = (req as Request & { user: JwtPayload }).user;
  const body = req.body as Partial<PredefinedMessage>;
  const title = (body.title ?? '').toString().trim();
  const messageBody = (body.body ?? '').toString();
  if (!title) {
    return res.status(400).json({ error: 'נא להזין כותרת להודעה' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO predefined_messages (user_id, title, body)
       VALUES ($1, $2, $3) RETURNING id, user_id, title, body, created_at`,
      [user.userId, title, messageBody]
    );
    res.status(201).json(rowToMessage(rows[0]));
  } catch (err) {
    if (isDbConnectionError(err)) {
      return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    }
    console.error(err);
    res.status(500).json({ error: 'שגיאה בשמירת ההודעה' });
  }
});

// PATCH /messages/:id
router.patch('/:id', async (req: Request, res: Response) => {
  const user = (req as Request & { user: JwtPayload }).user;
  const { id } = req.params;
  const body = req.body as Partial<PredefinedMessage>;
  const updates: string[] = [];
  const values: unknown[] = [];
  let pos = 1;
  if (body.title !== undefined) {
    updates.push(`title = $${pos++}`);
    values.push(body.title.toString().trim());
  }
  if (body.body !== undefined) {
    updates.push(`body = $${pos++}`);
    values.push(body.body.toString());
  }
  if (updates.length === 0) {
    const { rows } = await pool.query(
      `SELECT id, user_id, title, body, created_at FROM predefined_messages WHERE id = $1 AND user_id = $2`,
      [id, user.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'הודעה לא נמצאה' });
    return res.json(rowToMessage(rows[0]));
  }
  values.push(id, user.userId);
  try {
    const { rows } = await pool.query(
      `UPDATE predefined_messages SET ${updates.join(', ')} WHERE id = $${pos} AND user_id = $${pos + 1} RETURNING id, user_id, title, body, created_at`,
      values
    );
    if (rows.length === 0) return res.status(404).json({ error: 'הודעה לא נמצאה' });
    res.json(rowToMessage(rows[0]));
  } catch (err) {
    if (isDbConnectionError(err)) {
      return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    }
    console.error(err);
    res.status(500).json({ error: 'שגיאה בעדכון ההודעה' });
  }
});

// DELETE /messages/:id
router.delete('/:id', async (req: Request, res: Response) => {
  const user = (req as Request & { user: JwtPayload }).user;
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM predefined_messages WHERE id = $1 AND user_id = $2',
      [id, user.userId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'הודעה לא נמצאה' });
    res.status(204).send();
  } catch (err) {
    if (isDbConnectionError(err)) {
      return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    }
    console.error(err);
    res.status(500).json({ error: 'שגיאה במחיקת ההודעה' });
  }
});

export default router;
