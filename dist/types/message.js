"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToMessage = rowToMessage;
function rowToMessage(row) {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        body: row.body ?? '',
        createdAt: row.created_at.toISOString(),
    };
}
