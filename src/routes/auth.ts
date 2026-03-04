import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from '../db/client';
import { config } from '../config';
import { JwtPayload } from '../middleware/auth';
import { isDbConnectionError, DB_UNAVAILABLE_MESSAGE } from '../lib/dbError';

const router = Router();

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    return res.status(400).json({ error: 'נדרשים אימייל וסיסמה' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, name FROM users WHERE email = $1',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
    }
    const payload: JwtPayload = { userId: user.id, email: user.email };
    const token = jwt.sign(
      payload,
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    if (isDbConnectionError(err)) {
      console.error('[Auth] DB לא זמין (ECONNREFUSED). הרץ npm run setup.');
      return res.status(503).json({ error: DB_UNAVAILABLE_MESSAGE });
    }
    console.error(err);
    res.status(500).json({ error: 'שגיאה בהתחברות' });
  }
});

export default router;
