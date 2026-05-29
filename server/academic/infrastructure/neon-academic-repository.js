import { randomUUID } from 'node:crypto'
import { initDb } from '../../../api/db.js'

function generateId(prefix) {
  return `${prefix}-${randomUUID()}`
}

async function ensureAcademicTables(sql) {
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
}

async function createNeonAcademicRepository() {
  const sql = await initDb()
  await ensureAcademicTables(sql)

  return {
    generateId,
    async listDashboard() {
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
    },
    listAlunos: () => sql`
      SELECT id, nome, matricula, email, status, created_at
      FROM alunos
      ORDER BY created_at DESC
    `,
    async createAluno({ nome, matricula, email, status }) {
      const id = generateId('aluno')
      await sql`
        INSERT INTO alunos (id, nome, matricula, email, status)
        VALUES (${id}, ${nome}, ${matricula}, ${email || null}, ${status || 'ativo'})
      `
      return { id, nome, matricula, email: email || null, status: status || 'ativo' }
    },
    listMatriculas: () => sql`
      SELECT m.id, m.status, m.created_at, a.nome AS aluno_nome, a.matricula AS aluno_matricula,
        d.id AS disciplina_id, d.title AS disciplina_title
      FROM matriculas m
      JOIN alunos a ON a.id = m.aluno_id
      JOIN disciplinas d ON d.id = m.disciplina_id
      ORDER BY m.created_at DESC
    `,
    async createMatricula({ alunoId, disciplinaId, status }) {
      const id = generateId('matricula')
      await sql`
        INSERT INTO matriculas (id, aluno_id, disciplina_id, status)
        VALUES (${id}, ${alunoId}, ${disciplinaId}, ${status || 'ativa'})
      `
      return { id, alunoId, disciplinaId, status: status || 'ativa' }
    },
    listNotas: () => sql`
      SELECT n.id, n.avaliacao, n.nota, n.created_at,
        a.nome AS aluno_nome, a.matricula AS aluno_matricula,
        d.title AS disciplina_title
      FROM notas n
      JOIN alunos a ON a.id = n.aluno_id
      JOIN disciplinas d ON d.id = n.disciplina_id
      ORDER BY n.created_at DESC
    `,
    async createNota({ alunoId, disciplinaId, avaliacao, nota }) {
      const id = generateId('nota')
      await sql`
        INSERT INTO notas (id, aluno_id, disciplina_id, avaliacao, nota)
        VALUES (${id}, ${alunoId}, ${disciplinaId}, ${avaliacao}, ${Number(nota)})
      `
      return { id, alunoId, disciplinaId, avaliacao, nota: Number(nota) }
    },
    listProgresso: () => sql`
      SELECT p.id, p.concluido, p.total, p.percentual, p.updated_at,
        a.nome AS aluno_nome, a.matricula AS aluno_matricula,
        d.title AS disciplina_title
      FROM progresso_aluno p
      JOIN alunos a ON a.id = p.aluno_id
      JOIN disciplinas d ON d.id = p.disciplina_id
      ORDER BY p.updated_at DESC
    `,
    async findProgresso({ alunoId, disciplinaId }) {
      const rows = await sql`
        SELECT id FROM progresso_aluno
        WHERE aluno_id = ${alunoId} AND disciplina_id = ${disciplinaId}
        LIMIT 1
      `
      return rows[0] || null
    },
    async updateProgresso({ id, concluido, total, percentual }) {
      await sql`
        UPDATE progresso_aluno
        SET concluido = ${concluido}, total = ${total}, percentual = ${percentual}, updated_at = NOW()
        WHERE id = ${id}
      `
      return { id, concluido, total, percentual }
    },
    async createProgresso({ alunoId, disciplinaId, concluido, total, percentual }) {
      const id = generateId('progresso')
      await sql`
        INSERT INTO progresso_aluno (id, aluno_id, disciplina_id, concluido, total, percentual)
        VALUES (${id}, ${alunoId}, ${disciplinaId}, ${concluido}, ${total}, ${percentual})
      `
      return { id, alunoId, disciplinaId, concluido, total, percentual }
    },
    listCertidoes: () => sql`
      SELECT c.id, c.media, c.progresso, c.status, c.issued_at,
        a.nome AS aluno_nome, a.matricula AS aluno_matricula,
        d.title AS disciplina_title
      FROM certidoes c
      JOIN alunos a ON a.id = c.aluno_id
      JOIN disciplinas d ON d.id = c.disciplina_id
      ORDER BY c.issued_at DESC
    `,
    async calculateMediaAndProgresso({ alunoId, disciplinaId }) {
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
      return {
        media: Number(mediaRows[0]?.media || 0),
        progresso: Number(progressoRows[0]?.percentual || 0),
      }
    },
    async createCertidao({ alunoId, disciplinaId, media, progresso, status }) {
      const id = generateId('certidao')
      await sql`
        INSERT INTO certidoes (id, aluno_id, disciplina_id, media, progresso, status)
        VALUES (${id}, ${alunoId}, ${disciplinaId}, ${media}, ${progresso}, ${status})
      `
      return { id, alunoId, disciplinaId, media, progresso, status }
    },
    async findLatestAlunoAndDisciplinaIds() {
      const [alunoRows, disciplinaRows] = await Promise.all([
        sql`SELECT id FROM alunos ORDER BY created_at DESC LIMIT 1`,
        sql`SELECT id FROM disciplinas ORDER BY created_at DESC LIMIT 1`,
      ])
      return {
        alunoId: alunoRows[0]?.id || null,
        disciplinaId: disciplinaRows[0]?.id || null,
      }
    },
  }
}

export { createNeonAcademicRepository }
