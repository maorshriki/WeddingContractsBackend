"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const auth_1 = require("../middleware/auth");
const message_1 = require("../types/message");
const dbError_1 = require("../lib/dbError");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /messages — רשימת הודעות מובנות של המשתמש
router.get('/', async (req, res) => {
    const user = req.user;
    try {
        const { rows } = await client_1.pool.query(`SELECT id, user_id, title, body, created_at
       FROM predefined_messages WHERE user_id = $1 ORDER BY created_at DESC`, [user.userId]);
        res.json(rows.map(message_1.rowToMessage));
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה בקבלת ההודעות המובנות' });
    }
});
// POST /messages — יצירת הודעה מובנית
router.post('/', async (req, res) => {
    const user = req.user;
    const body = req.body;
    const title = (body.title ?? '').toString().trim();
    const messageBody = (body.body ?? '').toString();
    if (!title) {
        return res.status(400).json({ error: 'נא להזין כותרת להודעה' });
    }
    try {
        const { rows } = await client_1.pool.query(`INSERT INTO predefined_messages (user_id, title, body)
       VALUES ($1, $2, $3) RETURNING id, user_id, title, body, created_at`, [user.userId, title, messageBody]);
        res.status(201).json((0, message_1.rowToMessage)(rows[0]));
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה בשמירת ההודעה' });
    }
});
// PATCH /messages/:id
router.patch('/:id', async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const body = req.body;
    const updates = [];
    const values = [];
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
        const { rows } = await client_1.pool.query(`SELECT id, user_id, title, body, created_at FROM predefined_messages WHERE id = $1 AND user_id = $2`, [id, user.userId]);
        if (rows.length === 0)
            return res.status(404).json({ error: 'הודעה לא נמצאה' });
        return res.json((0, message_1.rowToMessage)(rows[0]));
    }
    values.push(id, user.userId);
    try {
        const { rows } = await client_1.pool.query(`UPDATE predefined_messages SET ${updates.join(', ')} WHERE id = $${pos} AND user_id = $${pos + 1} RETURNING id, user_id, title, body, created_at`, values);
        if (rows.length === 0)
            return res.status(404).json({ error: 'הודעה לא נמצאה' });
        res.json((0, message_1.rowToMessage)(rows[0]));
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה בעדכון ההודעה' });
    }
});
// DELETE /messages/:id
router.delete('/:id', async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
        const { rowCount } = await client_1.pool.query('DELETE FROM predefined_messages WHERE id = $1 AND user_id = $2', [id, user.userId]);
        if (rowCount === 0)
            return res.status(404).json({ error: 'הודעה לא נמצאה' });
        res.status(204).send();
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה במחיקת ההודעה' });
    }
});
exports.default = router;
