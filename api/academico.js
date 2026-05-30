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

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const resource = typeof req.query.resource === 'string' ? req.query.resource : ''

      if (!ALLOWED_GET.has(resource)) {
        return res.status(400).json({ error: 'Recurso inválido.' })
      }

      if (resource === 'dashboard') return res.status(200).json({ items: await listDashboard() })
      if (resource === 'alunos') return res.status(200).json({ items: await listAlunos() })
      if (resource === 'matriculas') return res.status(200).json({ items: await listMatriculas() })
      if (resource === 'notas') return res.status(200).json({ items: await listNotas() })
      if (resource === 'progresso') return res.status(200).json({ items: await listProgresso() })
      if (resource === 'certidoes') return res.status(200).json({ items: await listCertidoes() })
      if (resource === 'integracoes') return res.status(200).json({ items: await listIntegracoes() })
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
