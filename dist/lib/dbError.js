"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DB_UNAVAILABLE_MESSAGE = void 0;
exports.isDbConnectionError = isDbConnectionError;
/**
 * זיהוי שגיאות חיבור ל-DB והחזרת 503 במקום 500.
 */
const CONN_REFUSED = 'ECONNREFUSED';
function isDbConnectionError(err) {
    if (!err || typeof err !== 'object')
        return false;
    const e = err;
    if (e.code === CONN_REFUSED)
        return true;
    // pg-pool לעיתים מחזיר AggregateError עם errors[]
    if (Array.isArray(e.errors)) {
        return e.errors.some((x) => x?.code === CONN_REFUSED);
    }
    return false;
}
exports.DB_UNAVAILABLE_MESSAGE = 'הדאטאבייס לא זמין. הרץ npm run setup (או הפעל PostgreSQL).';
