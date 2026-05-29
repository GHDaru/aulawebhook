import { initAcademicoDb, processWebhookEvent } from '../academico-core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const sql = await initAcademicoDb()
    const [alunoRows, disciplinaRows] = await Promise.all([
      sql`SELECT id FROM alunos ORDER BY created_at DESC LIMIT 1`,
      sql`SELECT id FROM disciplinas ORDER BY created_at DESC LIMIT 1`,
    ])

    if (!alunoRows.length || !disciplinaRows.length) {
      return res.status(400).json({ error: 'Cadastre ao menos um aluno e uma disciplina para simular webhook.' })
    }

    const payload = {
      alunoId: alunoRows[0].id,
      disciplinaId: disciplinaRows[0].id,
      avaliacao: 'Simulação webhook',
      nota: 8.5,
    }

    const result = await processWebhookEvent({ source: 'simulado', eventType: 'nota', payload })
    return res.status(200).json({ simulated: true, result, payload })
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao simular webhook.', details: error?.message })
  }
}
