import { authenticateUser, parseJsonBody } from '../academico-core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método não permitido.' })
  }

  try {
    const { identifier, password } = parseJsonBody(req.body)
    const user = await authenticateUser(identifier, password)

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas.' })
    }

    return res.status(200).json({ user })
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao autenticar.', details: error?.message })
  }
}
