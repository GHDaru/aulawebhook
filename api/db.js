import { neon } from '@neondatabase/serverless'

let _sql = null

function getSql() {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('Variável DATABASE_URL não configurada no ambiente.')
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

export async function initDb() {
  const sql = getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS aulas (
      id   TEXT PRIMARY KEY,
      html TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  return sql
}

export async function getDb() {
  return getSql()
}
