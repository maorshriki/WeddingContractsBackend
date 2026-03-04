/**
 * זיהוי שגיאות חיבור ל-DB והחזרת 503 במקום 500.
 */
const CONN_REFUSED = 'ECONNREFUSED';

export function isDbConnectionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; [key: string]: unknown };
  if (e.code === CONN_REFUSED) return true;
  // pg-pool לעיתים מחזיר AggregateError עם errors[]
  if (Array.isArray(e.errors)) {
    return (e.errors as Array<{ code?: string }>).some((x) => x?.code === CONN_REFUSED);
  }
  return false;
}

export const DB_UNAVAILABLE_MESSAGE =
  'הדאטאבייס לא זמין. הרץ npm run setup (או הפעל PostgreSQL).';
