import { createNeonWebhookLogRepository } from '../infrastructure/neon-webhook-log-repository.js'
import { createMatricula, createNota, upsertProgresso } from '../../academic/application/use-cases.js'

async function listIntegracoes() {
  const repository = await createNeonWebhookLogRepository()
  return repository.list()
}

async function processWebhookEvent({ source, eventType, payload }) {
  const repository = await createNeonWebhookLogRepository()

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

    const id = await repository.logSuccess({ source, eventType, payload })
    return { id, processed: true }
  } catch (error) {
    await repository.logError({
      source,
      eventType,
      payload,
      details: error?.message || 'Erro desconhecido',
    })
    throw error
  }
}

export { listIntegracoes, processWebhookEvent }
