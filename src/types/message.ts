/** הודעה מובנית לוואטסאפ */
export interface PredefinedMessage {
  id: string;
  userId: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface PredefinedMessageRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  created_at: Date;
}

export function rowToMessage(row: PredefinedMessageRow): PredefinedMessage {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body ?? '',
    createdAt: row.created_at.toISOString(),
  };
}
