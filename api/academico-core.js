import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { initDb } from './db.js'

const DEFAULT_PASSWORD = 'Portal@2026'

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function verifyPassword(password, storedHash) {
  const [algorithm, salt, hash] = String(storedHash || '').split('$')
  if (algorithm !== 'scrypt' || !salt || !hash) {
    return false
  }

  const attempted = scryptSync(String(password), salt, 64).toString('hex')
  const attemptedBuffer = Buffer.from(attempted, 'hex')
  const hashBuffer = Buffer.from(hash, 'hex')

  if (attemptedBuffer.length !== hashBuffer.length) {
    return false
  }

  return timingSafeEqual(attemptedBuffer, hashBuffer)
}

function parseJsonBody(body) {
  if (!body) return {}
  if (typeof body === 'string') return JSON.parse(body)
  return body
}

function normalizeRole(role) {
  if (role === 'admin' || role === 'professor' || role === 'aluno') return role
  return 'aluno'
}

async function ensureDefaultUsers(sql) {
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
        senha_hash = CASE WHEN usuarios.first_access THEN EXCLUDED.senha_hash ELSE usuarios.senha_hash END
    `
  }
}

export async function initAcademicoDb() {
  const sql = await initDb()

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

  await sql`
    CREATE TABLE IF NOT EXISTS alunos (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      matricula TEXT UNIQUE NOT NULL,
      email TEXT,
      status TEXT NOT NULL DEFAULT 'ativo',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS matriculas (
      id TEXT PRIMARY KEY,
      aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      disciplina_id TEXT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ativa',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (aluno_id, disciplina_id)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS notas (
      id TEXT PRIMARY KEY,
      aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      disciplina_id TEXT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
      avaliacao TEXT NOT NULL,
      nota NUMERIC(5,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS progresso_aluno (
      id TEXT PRIMARY KEY,
      aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      disciplina_id TEXT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
      concluido INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL DEFAULT 0,
      percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (aluno_id, disciplina_id)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS certidoes (
      id TEXT PRIMARY KEY,
      aluno_id TEXT NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
      disciplina_id TEXT NOT NULL REFERENCES disciplinas(id) ON DELETE CASCADE,
      media NUMERIC(5,2) NOT NULL,
      progresso NUMERIC(5,2) NOT NULL,
      status TEXT NOT NULL,
      issued_at TIMESTAMPTZ DEFAULT NOW()
    )
  `

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

  await ensureDefaultUsers(sql)

  return sql
}

export function generateId(prefix) {
  return `${prefix}-${randomUUID()}`
}

export async function authenticateUser(identifier, password) {
  const sql = await initAcademicoDb()
  const lookup = String(identifier || '').trim()

  const users = await sql`
    SELECT id, nome, matricula, role, first_access, senha_hash
    FROM usuarios
    WHERE id = ${lookup} OR matricula = ${lookup}
    LIMIT 1
  `

  if (!users.length) return null

  const user = users[0]
  if (!verifyPassword(password || '', user.senha_hash)) return null

  return {
    id: user.id,
    nome: user.nome,
    matricula: user.matricula,
    role: normalizeRole(user.role),
    firstAccess: Boolean(user.first_access),
  }
}

export async function changeUserPassword(userId, newPassword) {
  const sql = await initAcademicoDb()
  await sql`
    UPDATE usuarios
    SET senha_hash = ${hashPassword(newPassword)}, first_access = false
    WHERE id = ${userId}
  `
}

export async function listDashboard() {
  const sql = await initAcademicoDb()
  const [disciplinas, aulas, alunos, matriculas, notas, certidoes, webhooks] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total FROM disciplinas`,
    sql`SELECT COUNT(*)::int AS total FROM aulas WHERE disciplina_id IS NOT NULL`,
    sql`SELECT COUNT(*)::int AS total FROM alunos`,
    sql`SELECT COUNT(*)::int AS total FROM matriculas`,
    sql`SELECT COUNT(*)::int AS total FROM notas`,
    sql`SELECT COUNT(*)::int AS total FROM certidoes`,
    sql`SELECT COUNT(*)::int AS total FROM webhook_logs`,
  ])

  return {
    disciplinas: disciplinas[0]?.total || 0,
    aulas: aulas[0]?.total || 0,
    alunos: alunos[0]?.total || 0,
    matriculas: matriculas[0]?.total || 0,
    notas: notas[0]?.total || 0,
    certidoes: certidoes[0]?.total || 0,
    webhooks: webhooks[0]?.total || 0,
  }
}

export async function listAlunos() {
  const sql = await initAcademicoDb()
  return sql`
    SELECT id, nome, matricula, email, status, created_at
    FROM alunos
    ORDER BY created_at DESC
  `
}

export async function createAluno({ nome, matricula, email, status, defaultPassword }) {
  const sql = await initAcademicoDb()
  const id = generateId('aluno')
  const finalStatus = status || 'ativo'

  await sql`
    INSERT INTO alunos (id, nome, matricula, email, status)
    VALUES (${id}, ${nome}, ${matricula}, ${email || null}, ${finalStatus})
  `

  await sql`
    INSERT INTO usuarios (id, nome, matricula, role, senha_hash, first_access)
    VALUES (${`user-${id}`}, ${nome}, ${matricula}, 'aluno', ${hashPassword(defaultPassword || DEFAULT_PASSWORD)}, true)
    ON CONFLICT (matricula) DO NOTHING
  `

  return { id, nome, matricula, email: email || null, status: finalStatus }
}

export async function createAlunosFromCsv({ csvText, defaultPassword }) {
  const lines = String(csvText || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const created = []

  for (const line of lines) {
    const [nomeRaw, matriculaRaw, emailRaw] = line.split(',').map((part) => part?.trim())
    if (!nomeRaw || !matriculaRaw) continue

    try {
      const aluno = await createAluno({
        nome: nomeRaw,
        matricula: matriculaRaw,
        email: emailRaw || null,
        defaultPassword,
      })
      created.push(aluno)
    } catch (error) {
      const message = String(error?.message || '')
      if (message.includes('duplicate key')) {
        continue
      }
      throw error
    }
  }

  return created
}

export async function listMatriculas() {
  const sql = await initAcademicoDb()
  return sql`
    SELECT m.id, m.status, m.created_at, a.nome AS aluno_nome, a.matricula AS aluno_matricula,
      d.id AS disciplina_id, d.title AS disciplina_title
    FROM matriculas m
    JOIN alunos a ON a.id = m.aluno_id
    JOIN disciplinas d ON d.id = m.disciplina_id
    ORDER BY m.created_at DESC
  `
}

export async function createMatricula({ alunoId, disciplinaId, status }) {
  const sql = await initAcademicoDb()
  const id = generateId('matricula')
  await sql`
    INSERT INTO matriculas (id, aluno_id, disciplina_id, status)
    VALUES (${id}, ${alunoId}, ${disciplinaId}, ${status || 'ativa'})
  `
  return { id, alunoId, disciplinaId, status: status || 'ativa' }
}

export async function listNotas() {
  const sql = await initAcademicoDb()
  return sql`
    SELECT n.id, n.avaliacao, n.nota, n.created_at,
      a.nome AS aluno_nome, a.matricula AS aluno_matricula,
      d.title AS disciplina_title
    FROM notas n
    JOIN alunos a ON a.id = n.aluno_id
    JOIN disciplinas d ON d.id = n.disciplina_id
    ORDER BY n.created_at DESC
  `
}

export async function createNota({ alunoId, disciplinaId, avaliacao, nota }) {
  const sql = await initAcademicoDb()
  const id = generateId('nota')
  await sql`
    INSERT INTO notas (id, aluno_id, disciplina_id, avaliacao, nota)
    VALUES (${id}, ${alunoId}, ${disciplinaId}, ${avaliacao}, ${Number(nota)})
  `
  return { id, alunoId, disciplinaId, avaliacao, nota: Number(nota) }
}

export async function listProgresso() {
  const sql = await initAcademicoDb()
  return sql`
    SELECT p.id, p.concluido, p.total, p.percentual, p.updated_at,
      a.nome AS aluno_nome, a.matricula AS aluno_matricula,
      d.title AS disciplina_title
    FROM progresso_aluno p
    JOIN alunos a ON a.id = p.aluno_id
    JOIN disciplinas d ON d.id = p.disciplina_id
    ORDER BY p.updated_at DESC
  `
}

export async function upsertProgresso({ alunoId, disciplinaId, concluido, total }) {
  const sql = await initAcademicoDb()
  const parsedConcluido = Number(concluido) || 0
  const parsedTotal = Number(total) || 0
  const safeConcluido = parsedConcluido < 0 ? 0 : parsedConcluido
  const safeTotal = parsedTotal < 0 ? 0 : parsedTotal
  const cappedConcluido = safeTotal > 0 ? Math.min(safeConcluido, safeTotal) : safeConcluido
  const percentual = safeTotal > 0 ? Number(((cappedConcluido / safeTotal) * 100).toFixed(2)) : 0

  const existing = await sql`
    SELECT id FROM progresso_aluno
    WHERE aluno_id = ${alunoId} AND disciplina_id = ${disciplinaId}
    LIMIT 1
  `

  if (existing.length) {
    await sql`
      UPDATE progresso_aluno
      SET concluido = ${cappedConcluido}, total = ${safeTotal}, percentual = ${percentual}, updated_at = NOW()
      WHERE id = ${existing[0].id}
    `
    return { id: existing[0].id, alunoId, disciplinaId, concluido: cappedConcluido, total: safeTotal, percentual }
  }

  const id = generateId('progresso')
  await sql`
    INSERT INTO progresso_aluno (id, aluno_id, disciplina_id, concluido, total, percentual)
    VALUES (${id}, ${alunoId}, ${disciplinaId}, ${cappedConcluido}, ${safeTotal}, ${percentual})
  `

  return { id, alunoId, disciplinaId, concluido: cappedConcluido, total: safeTotal, percentual }
}

export async function listCertidoes() {
  const sql = await initAcademicoDb()
  return sql`
    SELECT c.id, c.media, c.progresso, c.status, c.issued_at,
      a.nome AS aluno_nome, a.matricula AS aluno_matricula,
      d.title AS disciplina_title
    FROM certidoes c
    JOIN alunos a ON a.id = c.aluno_id
    JOIN disciplinas d ON d.id = c.disciplina_id
    ORDER BY c.issued_at DESC
  `
}

export async function emitirCertidao({ alunoId, disciplinaId, notaMinima = 6, progressoMinimo = 75 }) {
  const sql = await initAcademicoDb()

  const [mediaRows, progressoRows] = await Promise.all([
    sql`
      SELECT COALESCE(AVG(nota), 0)::numeric(5,2) AS media
      FROM notas
      WHERE aluno_id = ${alunoId} AND disciplina_id = ${disciplinaId}
    `,
    sql`
      SELECT COALESCE(percentual, 0)::numeric(5,2) AS percentual
      FROM progresso_aluno
      WHERE aluno_id = ${alunoId} AND disciplina_id = ${disciplinaId}
      LIMIT 1
    `,
  ])

  const media = Number(mediaRows[0]?.media || 0)
  const progresso = Number(progressoRows[0]?.percentual || 0)
  const status = media >= Number(notaMinima) && progresso >= Number(progressoMinimo) ? 'aprovado' : 'pendente'
  const id = generateId('certidao')

  await sql`
    INSERT INTO certidoes (id, aluno_id, disciplina_id, media, progresso, status)
    VALUES (${id}, ${alunoId}, ${disciplinaId}, ${media}, ${progresso}, ${status})
  `

  return { id, alunoId, disciplinaId, media, progresso, status }
}

export async function listIntegracoes() {
  const sql = await initAcademicoDb()
  return sql`
    SELECT id, source, event_type, payload, status, details, created_at
    FROM webhook_logs
    ORDER BY created_at DESC
    LIMIT 100
  `
}

export async function processWebhookEvent({ source, eventType, payload }) {
  const sql = await initAcademicoDb()
  const logId = generateId('webhook')

  try {
    if (eventType === 'nota') {
      await createNota({
        alunoId: payload.alunoId,
        disciplinaId: payload.disciplinaId,
        avaliacao: payload.avaliacao || 'Webhook',
        nota: payload.nota,
      })
    } else if (eventType === 'progresso') {
      await upsertProgresso({
        alunoId: payload.alunoId,
        disciplinaId: payload.disciplinaId,
        concluido: payload.concluido,
        total: payload.total,
      })
    } else if (eventType === 'matricula') {
      await createMatricula({
        alunoId: payload.alunoId,
        disciplinaId: payload.disciplinaId,
        status: payload.status || 'ativa',
      })
    } else {
      throw new Error('Tipo de evento não suportado.')
    }

    await sql`
      INSERT INTO webhook_logs (id, source, event_type, payload, status, details)
      VALUES (${logId}, ${source}, ${eventType}, ${JSON.stringify(payload)}, 'sucesso', 'Processado com sucesso')
    `

    return { id: logId, processed: true }
  } catch (error) {
    await sql`
      INSERT INTO webhook_logs (id, source, event_type, payload, status, details)
      VALUES (${logId}, ${source}, ${eventType}, ${JSON.stringify(payload || {})}, 'erro', ${error?.message || 'Erro desconhecido'})
    `
    throw error
  }
}

export { DEFAULT_PASSWORD, parseJsonBody }
