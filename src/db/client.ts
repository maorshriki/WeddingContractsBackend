import { Pool } from 'pg';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.database.url,
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected DB error', err);
});
