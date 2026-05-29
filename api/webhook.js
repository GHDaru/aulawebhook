import { parseJsonBody, processWebhookEvent } from './academico-core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const { eventType, payload } = parseJsonBody(req.body)

    if (!eventType || !payload) {
      return res.status(400).json({ error: 'Informe eventType e payload.' })
    }

    const result = await processWebhookEvent({ source: 'externo', eventType, payload })
    return res.status(200).json({ received: true, result })
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao processar webhook.', details: error?.message })
  }
}
