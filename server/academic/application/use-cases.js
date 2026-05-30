import { createNeonAcademicRepository } from '../infrastructure/neon-academic-repository.js'
import { DEFAULT_PASSWORD } from '../../identity/infrastructure/neon-user-repository.js'
import { provisionStudentIdentity } from '../../identity/application/use-cases.js'

async function listDashboard() {
  const repository = await createNeonAcademicRepository()
  return repository.listDashboard()
}

async function listAlunos() {
  const repository = await createNeonAcademicRepository()
  return repository.listAlunos()
}

async function createAluno({ nome, matricula, email, status, defaultPassword }) {
  const repository = await createNeonAcademicRepository()
  const aluno = await repository.createAluno({ nome, matricula, email, status })

  await provisionStudentIdentity({
    userId: `user-${aluno.id}`,
    nome,
    matricula,
    defaultPassword: defaultPassword || DEFAULT_PASSWORD,
  })

  return aluno
}

async function createAlunosFromCsv({ csvText, defaultPassword }) {
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
      if (message.includes('duplicate key')) continue
      throw error
    }
  }

  return created
}

async function listMatriculas() {
  const repository = await createNeonAcademicRepository()
  return repository.listMatriculas()
}

async function createMatricula({ alunoId, disciplinaId, status }) {
  const repository = await createNeonAcademicRepository()
  return repository.createMatricula({ alunoId, disciplinaId, status })
}

async function listNotas() {
  const repository = await createNeonAcademicRepository()
  return repository.listNotas()
}

async function createNota({ alunoId, disciplinaId, avaliacao, nota }) {
  const repository = await createNeonAcademicRepository()
  return repository.createNota({ alunoId, disciplinaId, avaliacao, nota })
}

function normalizeProgress({ concluido, total }) {
  const parsedConcluido = Number(concluido) || 0
  const parsedTotal = Number(total) || 0
  const safeConcluido = parsedConcluido < 0 ? 0 : parsedConcluido
  const safeTotal = parsedTotal < 0 ? 0 : parsedTotal
  const cappedConcluido = safeTotal > 0 ? Math.min(safeConcluido, safeTotal) : safeConcluido
  const percentual = safeTotal > 0 ? Number(((cappedConcluido / safeTotal) * 100).toFixed(2)) : 0

  return {
    concluido: cappedConcluido,
    total: safeTotal,
    percentual,
  }
}

async function listProgresso() {
  const repository = await createNeonAcademicRepository()
  return repository.listProgresso()
}

async function upsertProgresso({ alunoId, disciplinaId, concluido, total }) {
  const repository = await createNeonAcademicRepository()
  const normalized = normalizeProgress({ concluido, total })
  const existing = await repository.findProgresso({ alunoId, disciplinaId })

  if (existing) {
    const updated = await repository.updateProgresso({
      id: existing.id,
      concluido: normalized.concluido,
      total: normalized.total,
      percentual: normalized.percentual,
    })

    return { ...updated, alunoId, disciplinaId }
  }

  return repository.createProgresso({ alunoId, disciplinaId, ...normalized })
}

async function listCertidoes() {
  const repository = await createNeonAcademicRepository()
  return repository.listCertidoes()
}

async function emitirCertidao({ alunoId, disciplinaId, notaMinima = 6, progressoMinimo = 75 }) {
  const repository = await createNeonAcademicRepository()
  const { media, progresso } = await repository.calculateMediaAndProgresso({ alunoId, disciplinaId })
  const status = media >= Number(notaMinima) && progresso >= Number(progressoMinimo) ? 'aprovado' : 'pendente'

  return repository.createCertidao({
    alunoId,
    disciplinaId,
    media,
    progresso,
    status,
  })
}

async function findLatestAlunoAndDisciplinaIds() {
  const repository = await createNeonAcademicRepository()
  return repository.findLatestAlunoAndDisciplinaIds()
}

export {
  createAluno,
  createAlunosFromCsv,
  createMatricula,
  createNota,
  emitirCertidao,
  findLatestAlunoAndDisciplinaIds,
  listAlunos,
  listCertidoes,
  listDashboard,
  listMatriculas,
  listNotas,
  listProgresso,
  normalizeProgress,
  upsertProgresso,
}
