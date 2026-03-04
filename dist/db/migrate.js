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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./client");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
async function migrate() {
    // Support both src/db and dist/db
    const schemaPath = path.join(__dirname, 'schema.sql');
    let sql;
    if (fs.existsSync(schemaPath)) {
        sql = fs.readFileSync(schemaPath, 'utf8');
    }
    else {
        const srcPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
        sql = fs.readFileSync(srcPath, 'utf8');
    }
    await client_1.pool.query(sql);
    // Default templates are loaded from data/default-templates.json by the API (no DB seed).
    // Seed demo user (password: demo123)
    const hash = await bcryptjs_1.default.hash('demo123', 10);
    await client_1.pool.query(`INSERT INTO users (id, email, password_hash, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE SET password_hash = $3, name = $4`, ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'daniel@example.com', hash, 'דניאל הפקות']);
    console.log('Migration complete.');
    process.exit(0);
}
migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
