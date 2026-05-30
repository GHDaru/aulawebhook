import { changeUserPassword } from '../../server/identity/application/use-cases.js'
import { InvalidPasswordError } from '../../server/identity/domain/errors.js'
import { parseJsonBody } from '../../server/shared/json.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const { userId, newPassword } = parseJsonBody(req.body)
    await changeUserPassword({ userId, newPassword: String(newPassword) })
    return res.status(200).json({ changed: true })
  } catch (error) {
    if (error instanceof InvalidPasswordError || error?.status === 400) {
      return res.status(400).json({ error: 'Informe usuário e nova senha com no mínimo 6 caracteres.' })
    }

    return res.status(500).json({ error: 'Erro ao trocar senha.', details: error?.message })
  }
}
