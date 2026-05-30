import { randomUUID } from 'node:crypto'
import { initDb } from '../../../api/db.js'

function generateId(prefix) {
  return `${prefix}-${randomUUID()}`
}

async function createNeonWebhookLogRepository() {
  const sql = await initDb()
  await sql`
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT,
      status TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  return {
    async list() {
      return sql`
        SELECT id, source, event_type, payload, status, details, created_at
        FROM webhook_logs
        ORDER BY created_at DESC
        LIMIT 100
      `
    },
    async logSuccess({ source, eventType, payload }) {
      const id = generateId('webhook')
      await sql`
        INSERT INTO webhook_logs (id, source, event_type, payload, status, details)
        VALUES (${id}, ${source}, ${eventType}, ${JSON.stringify(payload)}, 'sucesso', 'Processado com sucesso')
      `
      return id
    },
    async logError({ source, eventType, payload, details }) {
      const id = generateId('webhook')
      await sql`
        INSERT INTO webhook_logs (id, source, event_type, payload, status, details)
        VALUES (${id}, ${source}, ${eventType}, ${JSON.stringify(payload || {})}, 'erro', ${details})
      `
      return id
    },
  }
}

export { createNeonWebhookLogRepository }
