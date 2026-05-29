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

  const idColumn = await sql`
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'aulas'
      AND column_name = 'id'
    LIMIT 1
  `

  if (idColumn.length && idColumn[0].data_type !== 'text') {
    await sql`ALTER TABLE aulas ALTER COLUMN id TYPE TEXT USING id::text`
  }

  await sql`
    CREATE TABLE IF NOT EXISTS disciplinas (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`ALTER TABLE aulas ADD COLUMN IF NOT EXISTS disciplina_id TEXT`
  await sql`ALTER TABLE aulas ADD COLUMN IF NOT EXISTS lesson_order INTEGER`
  await sql`ALTER TABLE aulas ADD COLUMN IF NOT EXISTS title TEXT`

  await sql`
    CREATE INDEX IF NOT EXISTS aulas_disciplina_id_idx
    ON aulas (disciplina_id, lesson_order)
  `

  await sql`DROP INDEX IF EXISTS aulas_disciplina_ordem_uq`
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS aulas_disciplina_lesson_order_unique_idx
    ON aulas (disciplina_id, lesson_order)
    WHERE disciplina_id IS NOT NULL
  `

  return sql
}

export async function getDb() {
  return getSql()
}
