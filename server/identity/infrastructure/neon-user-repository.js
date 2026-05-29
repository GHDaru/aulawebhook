import { initDb } from '../../../api/db.js'

const DEFAULT_PASSWORD = 'Portal@2026'

function normalizeRole(role) {
  if (role === 'admin' || role === 'professor' || role === 'aluno') return role
  return 'aluno'
}

async function ensureUsersTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      matricula TEXT UNIQUE,
      role TEXT NOT NULL,
      senha_hash TEXT NOT NULL,
      first_access BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
}

async function ensureDefaultUsers(sql, hashPassword) {
  const defaults = [
    { id: 'admin', nome: 'Administrador', matricula: '0001', role: 'admin', senha: DEFAULT_PASSWORD },
    { id: 'professor', nome: 'Professor', matricula: '0002', role: 'professor', senha: DEFAULT_PASSWORD },
    { id: 'aluno-demo', nome: 'Aluno Demo', matricula: '20260001', role: 'aluno', senha: DEFAULT_PASSWORD },
  ]

  for (const user of defaults) {
    await sql`
      INSERT INTO usuarios (id, nome, matricula, role, senha_hash, first_access)
      VALUES (${user.id}, ${user.nome}, ${user.matricula}, ${user.role}, ${hashPassword(user.senha)}, true)
      ON CONFLICT (id) DO UPDATE
      SET nome = EXCLUDED.nome,
        matricula = EXCLUDED.matricula,
        role = EXCLUDED.role,
        senha_hash = CASE WHEN usuarios.first_access THEN EXCLUDED.senha_hash ELSE usuarios.senha_hash END,
        first_access = CASE WHEN usuarios.first_access THEN true ELSE usuarios.first_access END
    `
  }
}

async function createNeonUserRepository({ hashPassword }) {
  const sql = await initDb()
  await ensureUsersTable(sql)
  await ensureDefaultUsers(sql, hashPassword)

  return {
    async findByIdentifier(identifier) {
      const rows = await sql`
        SELECT id, nome, matricula, role, first_access, senha_hash
        FROM usuarios
        WHERE id = ${identifier} OR matricula = ${identifier}
        LIMIT 1
      `
      return rows[0] || null
    },

    async updatePassword({ userId, passwordHash }) {
      await sql`
        UPDATE usuarios
        SET senha_hash = ${passwordHash}, first_access = false
        WHERE id = ${userId}
      `
    },

    async upsertStudentUser({ userId, nome, matricula, passwordHash }) {
      await sql`
        INSERT INTO usuarios (id, nome, matricula, role, senha_hash, first_access)
        VALUES (${userId}, ${nome}, ${matricula}, 'aluno', ${passwordHash}, true)
        ON CONFLICT (matricula) DO NOTHING
      `
    },
  }
}

export { DEFAULT_PASSWORD, createNeonUserRepository, normalizeRole }
