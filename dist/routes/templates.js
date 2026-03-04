"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const client_1 = require("../db/client");
const auth_1 = require("../middleware/auth");
const template_1 = require("../types/template");
const dbError_1 = require("../lib/dbError");
const rtfFromSections_1 = require("../lib/rtfFromSections");
const router = (0, express_1.Router)();
/** טעינת תבניות ברירת מחדל מקובץ JSON (ללא DB). אם יש sections – ממירים ל-RTF עם כותרות מודגשות. */
function loadDefaultTemplates() {
    const toTry = [
        path.join(process.cwd(), 'data', 'default-templates.json'),
        path.join(__dirname, '..', '..', 'data', 'default-templates.json'),
    ];
    for (const p of toTry) {
        if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf8');
            const arr = JSON.parse(raw);
            const now = new Date().toISOString();
            const result = arr.map((t) => {
                let sectionContents;
                if (Array.isArray(t.sections) && t.sections.length > 0) {
                    // טקסט פשוט – מפענח ה-RTF ב-iOS לא תומך ב־ansicpg1255, אז שולחים plain
                    sectionContents = [(0, rtfFromSections_1.plainFromSections)(t.sections)];
                }
                else {
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
router.get('/defaults', async (_req, res) => {
    try {
        const templates = loadDefaultTemplates();
        res.json(templates);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'שגיאה בקבלת תבניות ברירת מחדל' });
    }
});
router.use(auth_1.authMiddleware);
// GET /templates — user's saved templates
router.get('/', async (req, res) => {
    const user = req.user;
    try {
        const { rows } = await client_1.pool.query(`SELECT id, user_id, name, template_description, vendor_type, section_contents, created_at
       FROM contract_templates WHERE user_id = $1 ORDER BY created_at DESC`, [user.userId]);
        res.json(rows.map(template_1.rowToTemplate));
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה בקבלת התבניות' });
    }
});
// POST /templates — save user template (name + content)
router.post('/', async (req, res) => {
    const user = req.user;
    const body = req.body;
    if (!body.name) {
        return res.status(400).json({ error: 'חסר שם תבנית' });
    }
    try {
        const sectionContents = Array.isArray(body.sectionContents) ? body.sectionContents : [];
        const { rows } = await client_1.pool.query(`INSERT INTO contract_templates (user_id, name, template_description, vendor_type, section_contents)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [
            user.userId,
            body.name,
            body.templateDescription ?? '',
            body.vendorType ?? null,
            JSON.stringify(sectionContents),
        ]);
        res.status(201).json((0, template_1.rowToTemplate)(rows[0]));
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה בשמירת התבנית' });
    }
});
// PATCH /templates/:id
router.patch('/:id', async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const body = req.body;
    const updates = [];
    const values = [];
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
            const { rows } = await client_1.pool.query(`SELECT * FROM contract_templates WHERE id = $1 AND user_id = $2`, [id, user.userId]);
            if (rows.length === 0)
                return res.status(404).json({ error: 'תבנית לא נמצאה' });
            return res.json((0, template_1.rowToTemplate)(rows[0]));
        }
        catch (err) {
            if ((0, dbError_1.isDbConnectionError)(err)) {
                return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
            }
            throw err;
        }
    }
    values.push(id, user.userId);
    try {
        const { rows } = await client_1.pool.query(`UPDATE contract_templates SET ${updates.join(', ')} WHERE id = $${pos} AND user_id = $${pos + 1} RETURNING *`, values);
        if (rows.length === 0)
            return res.status(404).json({ error: 'תבנית לא נמצאה' });
        res.json((0, template_1.rowToTemplate)(rows[0]));
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה בעדכון התבנית' });
    }
});
// DELETE /templates/:id — delete user's template
router.delete('/:id', async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    try {
        const { rowCount } = await client_1.pool.query(`DELETE FROM contract_templates WHERE id = $1 AND user_id = $2`, [id, user.userId]);
        if (rowCount === 0)
            return res.status(404).json({ error: 'תבנית לא נמצאה' });
        res.status(204).send();
    }
    catch (err) {
        if ((0, dbError_1.isDbConnectionError)(err)) {
            return res.status(503).json({ error: dbError_1.DB_UNAVAILABLE_MESSAGE });
        }
        console.error(err);
        res.status(500).json({ error: 'שגיאה במחיקת התבנית' });
    }
});
exports.default = router;
