import {
  createAluno,
  createAlunosFromCsv,
  createMatricula,
  createNota,
  emitirCertidao,
  listAlunos,
  listCertidoes,
  listDashboard,
  listMatriculas,
  listNotas,
  listProgresso,
  upsertProgresso,
} from '../server/academic/application/use-cases.js'
import { listIntegracoes } from '../server/integrations/application/use-cases.js'
import { parseJsonBody } from '../server/shared/json.js'

const ALLOWED_GET = new Set(['dashboard', 'alunos', 'matriculas', 'notas', 'progresso', 'certidoes', 'integracoes'])

function firstHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value
}

function filterAlunoItems(resource, items, matricula) {
  if (!matricula) {
    return resource === 'dashboard'
      ? { disciplinas: 0, aulas: 0, alunos: 0, matriculas: 0, notas: 0, certidoes: 0, webhooks: 0 }
      : []
  }
  if (resource === 'matriculas' || resource === 'notas' || resource === 'progresso' || resource === 'certidoes') {
    return items.filter((item) => item.aluno_matricula === matricula)
  }

  if (resource === 'dashboard') {
    const matriculas = Array.isArray(items.matriculas) ? items.matriculas : []
    const notas = Array.isArray(items.notas) ? items.notas : []
    const progresso = Array.isArray(items.progresso) ? items.progresso : []
    const certidoes = Array.isArray(items.certidoes) ? items.certidoes : []
    const cursos = new Set(matriculas.map((item) => item.disciplina_title).filter(Boolean))
    const aulas = progresso.reduce((total, item) => total + (Number(item.total) || 0), 0)
    return {
      disciplinas: cursos.size,
      aulas,
      alunos: 0,
      matriculas: matriculas.length,
      notas: notas.length,
      certidoes: certidoes.length,
      webhooks: 0,
    }
  }
  return []
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const resource = typeof req.query.resource === 'string' ? req.query.resource : ''
      const userRole = String(firstHeaderValue(req.headers['x-user-role']) || '').trim()
      const userMatricula = String(firstHeaderValue(req.headers['x-user-matricula']) || '').trim()

      if (!ALLOWED_GET.has(resource)) {
        return res.status(400).json({ error: 'Recurso inválido.' })
      }

      let items = null
      if (resource === 'dashboard') items = await listDashboard()
      if (resource === 'alunos') items = await listAlunos()
      if (resource === 'matriculas') items = await listMatriculas()
      if (resource === 'notas') items = await listNotas()
      if (resource === 'progresso') items = await listProgresso()
      if (resource === 'certidoes') items = await listCertidoes()
      if (resource === 'integracoes') items = await listIntegracoes()

      if (userRole === 'aluno') {
        if (resource === 'dashboard') {
          const [matriculas, notas, progresso, certidoes] = await Promise.all([
            listMatriculas(),
            listNotas(),
            listProgresso(),
            listCertidoes(),
          ])
          items = filterAlunoItems(resource, { matriculas, notas, progresso, certidoes }, userMatricula)
        } else {
          items = filterAlunoItems(resource, items, userMatricula)
        }
      }

      return res.status(200).json({ items })
    }

    if (req.method === 'POST') {
      const body = parseJsonBody(req.body)
      const resource = body.resource

      if (resource === 'alunos') {
        if (body.mode === 'bulk') {
          const created = await createAlunosFromCsv({ csvText: body.csvText, defaultPassword: body.defaultPassword })
          return res.status(201).json({ items: created })
        }

        const aluno = await createAluno({
          nome: body.nome,
          matricula: body.matricula,
          email: body.email,
          status: body.status,
          defaultPassword: body.defaultPassword,
        })
        return res.status(201).json({ item: aluno })
      }

      if (resource === 'matriculas') {
        const matricula = await createMatricula({
          alunoId: body.alunoId,
          disciplinaId: body.disciplinaId,
          status: body.status,
        })
        return res.status(201).json({ item: matricula })
      }

      if (resource === 'notas') {
        const nota = await createNota({
          alunoId: body.alunoId,
          disciplinaId: body.disciplinaId,
          avaliacao: body.avaliacao,
          nota: body.nota,
        })
        return res.status(201).json({ item: nota })
      }

      if (resource === 'progresso') {
        const progresso = await upsertProgresso({
          alunoId: body.alunoId,
          disciplinaId: body.disciplinaId,
          concluido: body.concluido,
          total: body.total,
        })
        return res.status(200).json({ item: progresso })
      }

      if (resource === 'certidoes') {
        const certidao = await emitirCertidao({
          alunoId: body.alunoId,
          disciplinaId: body.disciplinaId,
          notaMinima: body.notaMinima,
          progressoMinimo: body.progressoMinimo,
        })
        return res.status(201).json({ item: certidao })
      }

      return res.status(400).json({ error: 'Recurso inválido.' })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  } catch (error) {
    return res.status(500).json({ error: 'Erro no módulo acadêmico.', details: error?.message })
  }
}
