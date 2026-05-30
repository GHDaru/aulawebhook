import { findLatestAlunoAndDisciplinaIds } from '../../server/academic/application/use-cases.js'
import { processWebhookEvent } from '../../server/integrations/application/use-cases.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const { alunoId, disciplinaId } = await findLatestAlunoAndDisciplinaIds()

    if (!alunoId || !disciplinaId) {
      return res.status(400).json({ error: 'Cadastre ao menos um aluno e um curso para simular webhook.' })
    }

    const payload = {
      alunoId,
      disciplinaId,
      avaliacao: 'Simulação webhook',
      nota: 8.5,
    }

    const result = await processWebhookEvent({ source: 'simulado', eventType: 'nota', payload })
    return res.status(200).json({ simulated: true, result, payload })
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao simular webhook.', details: error?.message })
  }
}
