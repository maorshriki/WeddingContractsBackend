"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const config_1 = require("../config");
exports.pool = new pg_1.Pool({
    connectionString: config_1.config.database.url,
    max: 10,
    idleTimeoutMillis: 30000,
});
exports.pool.on('error', (err) => {
    console.error('Unexpected DB error', err);
});
