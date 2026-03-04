"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("../db/client");
const auth_1 = require("../middleware/auth");
const contract_1 = require("../types/contract");
const dbError_1 = require("../lib/dbError");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// GET /contracts
router.get('/', async (req, res) => {
    const user = req.user;
    try {
        const { rows } = await client_1.pool.query(`SELECT * FROM contracts WHERE user_id = $1 ORDER BY created_at DESC`, [user.userId]);
        const contracts = rows.map(contract_1.rowToContract);
        res.json(contracts);
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            console.error('[Contracts] DB לא זמין. הרץ npm run setup.');
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה בקבלת החוזים' });
    }
});
// GET /contracts/:id
router.get('/:id', async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
        const { rows } = await client_1.pool.query(`SELECT * FROM contracts WHERE id = $1 AND user_id = $2`, [id, user.userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'חוזה לא נמצא' });
        }
        res.json((0, contract_1.rowToContract)(rows[0]));
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            console.error('[Contracts] DB לא זמין. הרץ npm run setup.');
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה בקבלת החוזה' });
    }
});
// POST /contracts
router.post('/', async (req, res) => {
    const user = req.user;
    const body = req.body;
    if (!body.vendorType || !body.eventDetails || !body.pricing) {
        return res.status(400).json({ error: 'חסרים שדות חובה' });
    }
    const ed = body.eventDetails;
    const p = body.pricing;
    const eventDateStr = ed.eventDate ? ed.eventDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const startTimeStr = ed.startTime ? (typeof ed.startTime === 'string' && ed.startTime.includes('T') ? ed.startTime.slice(11, 16) : ed.startTime) : '19:00';
    try {
        const { rows } = await client_1.pool.query(`INSERT INTO contracts (
        user_id, vendor_type, couple_name, event_date, location, start_time,
        total_amount, advance_payment, payment_schedule, cancellation_term_ids, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`, [
            user.userId,
            body.vendorType,
            ed.coupleName || '',
            eventDateStr,
            ed.location || '',
            startTimeStr,
            p.totalAmount ?? 0,
            p.advancePayment ?? 0,
            JSON.stringify(p.paymentSchedule || []),
            body.cancellationTermIds || [],
            body.status || 'טיוטה',
        ]);
        res.status(201).json((0, contract_1.rowToContract)(rows[0]));
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            console.error('[Contracts] DB לא זמין. הרץ npm run setup.');
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה ביצירת החוזה' });
    }
});
// PATCH /contracts/:id/status
router.patch('/:id/status', async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({ error: 'חסר שדה status' });
    }
    const allowed = ['טיוטה', 'ממתין', 'נחתם', 'פעיל', 'בוטל'];
    if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'סטטוס לא תקין' });
    }
    try {
        const { rows } = await client_1.pool.query(`UPDATE contracts SET status = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *`, [status, id, user.userId]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'חוזה לא נמצא' });
        }
        res.json((0, contract_1.rowToContract)(rows[0]));
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            console.error('[Contracts] DB לא זמין. הרץ npm run setup.');
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה בעדכון הסטטוס' });
    }
});
// DELETE /contracts/:id
router.delete('/:id', async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
        const { rowCount } = await client_1.pool.query(`DELETE FROM contracts WHERE id = $1 AND user_id = $2`, [id, user.userId]);
        if (rowCount === 0) {
            return res.status(404).json({ error: 'חוזה לא נמצא' });
        }
        res.status(204).send();
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה במחיקת החוזה' });
    }
});
exports.default = router;
