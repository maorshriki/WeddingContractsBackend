"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("../db/client");
const config_1 = require("../config");
const dbError_1 = require("../lib/dbError");
const router = (0, express_1.Router)();
// POST /auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'נדרשים אימייל וסיסמה' });
    }
    try {
        const { rows } = await client_1.pool.query('SELECT id, email, password_hash, name FROM users WHERE email = $1', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
        }
        const user = rows[0];
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
        }
        const payload = { userId: user.id, email: user.email };
        const token = jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, { expiresIn: config_1.config.jwt.expiresIn });
        res.json({
            token,
            user: { id: user.id, email: user.email, name: user.name },
        });
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            console.error('[Auth] DB לא זמין (ECONNREFUSED). הרץ npm run setup.');
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה בהתחברות' });
    }
});
exports.default = router;
