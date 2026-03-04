"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_1 = require("./config");
const contracts_1 = __importDefault(require("./routes/contracts"));
const auth_1 = __importDefault(require("./routes/auth"));
const templates_1 = __importDefault(require("./routes/templates"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// לוג כל בקשה – כדי לראות בקונסול גם 404 ונתיבים
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
app.use(`${config_1.config.apiPrefix}/auth`, auth_1.default);
app.use(`${config_1.config.apiPrefix}/contracts`, contracts_1.default);
app.use(`${config_1.config.apiPrefix}/templates`, templates_1.default);
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use((req, res) => {
    console.warn(`[404] ${req.method} ${req.path} – לא נמצא`);
    res.status(404).json({ error: 'לא נמצא' });
});
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'שגיאת שרת' });
});
app.listen(config_1.config.port, () => {
    console.log(`Server listening on http://localhost:${config_1.config.port}${config_1.config.apiPrefix}`);
});
