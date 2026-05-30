import { authenticateUser } from '../../server/identity/application/use-cases.js'
import { InvalidCredentialsError } from '../../server/identity/domain/errors.js'
import { parseJsonBody } from '../../server/shared/json.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const { identifier, password } = parseJsonBody(req.body)
    const user = await authenticateUser({ identifier, password })
    return res.status(200).json({ user })
  } catch (error) {
    if (error instanceof InvalidCredentialsError || error?.status === 401) {
      return res.status(401).json({ error: 'Credenciais inválidas.' })
    }

    return res.status(500).json({ error: 'Erro ao autenticar.', details: error?.message })
  }
}
