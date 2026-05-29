import { changeUserPassword, parseJsonBody } from '../academico-core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const { userId, newPassword } = parseJsonBody(req.body)

    if (!userId || !newPassword || String(newPassword).trim().length < 6) {
      return res.status(400).json({ error: 'Informe usuário e nova senha com no mínimo 6 caracteres.' })
    }

    await changeUserPassword(userId, String(newPassword))
    return res.status(200).json({ changed: true })
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao trocar senha.', details: error?.message })
  }
}
